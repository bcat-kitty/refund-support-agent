"""Manual Anthropic tool-use loop.

We log every llm_request / llm_response / tool_call / tool_result / retry as a
discrete trace_event so the admin UI can render a full audit timeline. Using the
manual loop (instead of the SDK's auto tool runner) is deliberate: we need the
retry visibility and the per-step trace rows.
"""
from __future__ import annotations

import json
import sqlite3
import time
import uuid
from datetime import datetime, timezone

import anthropic

from ..config import settings
from ..services import customers as customers_svc
from ..services import policy as policy_svc
from ..trace import TraceLogger, TurnTally
from .system_prompt import build_session_context, build_system_blocks
from .tools import HANDLERS, TOOL_SCHEMAS


MAX_STEPS = 12
MAX_TOKENS = 4096


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _block_to_dict(block) -> dict:
    """Anthropic SDK blocks are pydantic-ish objects; convert to plain dicts for
    storage in messages.content and tracing."""
    if isinstance(block, dict):
        return block
    if hasattr(block, "model_dump"):
        return block.model_dump(exclude_none=True)
    return dict(block)


def _load_history(conn: sqlite3.Connection, session_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at, id",
        (session_id,),
    ).fetchall()
    history: list[dict] = []
    for r in rows:
        content = json.loads(r["content"])
        history.append({"role": r["role"], "content": content})
    return history


def _save_message(
    conn: sqlite3.Connection,
    session_id: str,
    role: str,
    content,
) -> str:
    mid = f"msg_{uuid.uuid4().hex[:10]}"
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (mid, session_id, role, json.dumps(content), _iso_now()),
    )
    return mid


def _touch_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", (_iso_now(), session_id))


def _assistant_text(content_blocks: list[dict]) -> str:
    parts = []
    for b in content_blocks:
        if b.get("type") == "text":
            parts.append(b.get("text", ""))
    return "\n".join(p for p in parts if p).strip()


def _dispatch_tool(
    conn: sqlite3.Connection,
    session_id: str,
    name: str,
    args: dict,
    tracer: TraceLogger,
) -> tuple[dict, bool]:
    """Execute a tool with one retry on transient errors. Returns (payload, is_error)."""
    attempt = 0
    last_error: str | None = None
    while True:
        attempt += 1
        started_at = _iso_now()
        t0 = time.monotonic()
        tracer.log_tool_call(name=name, args=args, started_at=started_at)
        try:
            handler = HANDLERS.get(name)
            if handler is None:
                latency_ms = int((time.monotonic() - t0) * 1000)
                tracer.log_tool_error(
                    name=name,
                    error=f"unknown tool: {name}",
                    latency_ms=latency_ms,
                    started_at=started_at,
                    ended_at=_iso_now(),
                )
                return {"ok": False, "error": f"unknown tool: {name}"}, True
            payload = handler(conn, session_id, args)
            latency_ms = int((time.monotonic() - t0) * 1000)
            tracer.log_tool_result(
                name=name,
                result=payload,
                latency_ms=latency_ms,
                started_at=started_at,
                ended_at=_iso_now(),
            )
            return payload, False
        except policy_svc.TransientPolicyServiceError as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            last_error = f"TransientPolicyServiceError: {e}"
            tracer.log_tool_error(
                name=name,
                error=last_error,
                latency_ms=latency_ms,
                started_at=started_at,
                ended_at=_iso_now(),
            )
            if attempt >= 2:
                return {"ok": False, "error": last_error, "transient": True}, True
            tracer.log_retry(name=name, attempt=attempt + 1, prior_error=last_error)
            continue
        except Exception as e:  # any other tool exception is non-retryable
            latency_ms = int((time.monotonic() - t0) * 1000)
            err = f"{type(e).__name__}: {e}"
            tracer.log_tool_error(
                name=name,
                error=err,
                latency_ms=latency_ms,
                started_at=started_at,
                ended_at=_iso_now(),
            )
            return {"ok": False, "error": err}, True


class AgentLoop:
    def __init__(self, anthropic_client: anthropic.Anthropic | None = None):
        if anthropic_client is None:
            if not settings.anthropic_api_key:
                raise RuntimeError(
                    "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key."
                )
            anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.client = anthropic_client

    def run_turn(
        self,
        conn: sqlite3.Connection,
        session_id: str,
        user_text: str,
    ) -> tuple[str, str, TurnTally]:
        """Run one turn: append user message, loop tool calls, return assistant text + tally."""
        # Save user message first.
        user_blocks = [{"type": "text", "text": user_text}]
        user_msg_id = _save_message(conn, session_id, "user", user_blocks)
        conn.commit()

        tracer = TraceLogger(conn, session_id=session_id, message_id=user_msg_id)

        # Build system + history.
        sess = conn.execute("SELECT customer_id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        assert sess is not None
        customer = customers_svc.find_by_id(conn, sess["customer_id"])
        assert customer is not None

        policy_doc = policy_svc.get_current(conn)
        system_blocks = build_system_blocks(policy_doc["content_md"])
        history = _load_history(conn, session_id)

        # Prepend session context to the latest user message so the model knows
        # who's signed in without re-asking. Keep system blocks frozen for caching.
        ctx = build_session_context(customer, session_id)
        if history and history[-1]["role"] == "user":
            blocks = history[-1]["content"]
            if isinstance(blocks, list) and blocks and blocks[0].get("type") == "text":
                blocks[0]["text"] = ctx + "\n\nCustomer says:\n" + blocks[0].get("text", "")

        assistant_blocks: list[dict] = []
        step = 0
        while step < MAX_STEPS:
            step += 1
            req_started = _iso_now()
            tracer.log_llm_request(
                model=settings.anthropic_model,
                payload_preview={
                    "model": settings.anthropic_model,
                    "messages": _summarize_messages(history),
                    "tool_count": len(TOOL_SCHEMAS),
                    "step": step,
                },
                started_at=req_started,
            )
            t0 = time.monotonic()
            response = self.client.messages.create(
                model=settings.anthropic_model,
                system=system_blocks,
                tools=TOOL_SCHEMAS,
                messages=history,
                max_tokens=MAX_TOKENS,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            response_blocks = [_block_to_dict(b) for b in response.content]
            tracer.log_llm_response(
                model=settings.anthropic_model,
                stop_reason=response.stop_reason or "",
                content_blocks=response_blocks,
                usage=response.usage.model_dump() if response.usage else {},
                latency_ms=latency_ms,
                started_at=req_started,
                ended_at=_iso_now(),
            )

            history.append({"role": "assistant", "content": response_blocks})
            assistant_blocks = response_blocks

            if response.stop_reason != "tool_use":
                break

            # Execute every tool_use block in the response.
            tool_results = []
            for block in response_blocks:
                if block.get("type") != "tool_use":
                    continue
                payload, is_error = _dispatch_tool(
                    conn,
                    session_id,
                    block["name"],
                    block.get("input") or {},
                    tracer,
                )
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block["id"],
                        "content": json.dumps(payload),
                        "is_error": is_error,
                    }
                )
            if not tool_results:
                # Defensive: tool_use stop reason but no tool_use blocks - break to avoid infinite loop.
                break
            history.append({"role": "user", "content": tool_results})
            conn.commit()
        else:
            # Hit MAX_STEPS without stop_reason=end_turn - politely truncate.
            assistant_blocks = [
                {
                    "type": "text",
                    "text": "I'm having trouble completing this request automatically. Let me escalate to a human reviewer who can help.",
                }
            ]

        assistant_text = _assistant_text(assistant_blocks) or "(no response)"
        asst_msg_id = _save_message(conn, session_id, "assistant", assistant_blocks)
        _touch_session(conn, session_id)
        conn.commit()
        return assistant_text, asst_msg_id, tracer.tally


def _summarize_messages(history: list[dict]) -> list[dict]:
    """Compact preview of message history for the llm_request trace event."""
    out = []
    for m in history[-6:]:
        content = m["content"]
        if isinstance(content, str):
            preview = content[:160]
        else:
            preview = []
            for b in content:
                if isinstance(b, dict):
                    if b.get("type") == "text":
                        preview.append({"type": "text", "text": (b.get("text") or "")[:160]})
                    elif b.get("type") == "tool_use":
                        preview.append({"type": "tool_use", "name": b.get("name")})
                    elif b.get("type") == "tool_result":
                        preview.append({"type": "tool_result", "is_error": b.get("is_error", False)})
        out.append({"role": m["role"], "content_preview": preview})
    return out
