from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..agent.loop import AgentLoop
from ..db import db_cursor
from ..schemas import (
    AssistantMessageOut,
    MessageOut,
    SendMessageIn,
    SessionOut,
    StartSessionIn,
    TurnMetrics,
)
from ..services import customers as customers_svc


router = APIRouter(tags=["chat"])

_agent: AgentLoop | None = None


def _get_agent() -> AgentLoop:
    global _agent
    if _agent is None:
        _agent = AgentLoop()
    return _agent


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@router.post("/sessions", response_model=SessionOut)
def start_session(body: StartSessionIn):
    with db_cursor() as conn:
        customer = customers_svc.find_by_email(conn, body.email)
        if not customer:
            raise HTTPException(status_code=404, detail=f"No customer with email '{body.email}'")
        session_id = f"ses_{uuid.uuid4().hex[:10]}"
        now = _iso_now()
        conn.execute(
            "INSERT INTO sessions (id, customer_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)",
            (session_id, customer["id"], now, now),
        )
        return SessionOut(
            id=session_id,
            customer=customer,
            created_at=now,
            last_seen_at=now,
        )


@router.post("/sessions/{session_id}/messages", response_model=AssistantMessageOut)
def send_message(session_id: str, body: SendMessageIn):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="message content cannot be empty")
    with db_cursor() as conn:
        sess = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail=f"unknown session {session_id}")
    try:
        agent = _get_agent()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    with db_cursor() as conn:
        try:
            assistant_text, message_id, tally = agent.run_turn(conn, session_id, body.content)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"agent error: {type(e).__name__}: {e}") from e
        created_at_row = conn.execute(
            "SELECT created_at FROM messages WHERE id = ?", (message_id,)
        ).fetchone()
    return AssistantMessageOut(
        message_id=message_id,
        role="assistant",
        content=assistant_text,
        created_at=created_at_row["created_at"] if created_at_row else _iso_now(),
        metrics=TurnMetrics(
            step_count=tally.step_count,
            tool_calls=tally.tool_calls,
            retries=tally.retries,
            tokens_in=tally.tokens_in,
            tokens_out=tally.tokens_out,
            latency_ms=tally.latency_ms,
            cost_usd=tally.cost_usd,
        ),
    )


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
def list_messages(session_id: str):
    with db_cursor() as conn:
        rows = conn.execute(
            "SELECT id, session_id, role, content, created_at FROM messages"
            " WHERE session_id = ? ORDER BY created_at, id",
            (session_id,),
        ).fetchall()
    out: list[MessageOut] = []
    for r in rows:
        content_blocks = json.loads(r["content"])
        # Flatten to a plain string for the chat UI.
        text_parts = []
        if isinstance(content_blocks, list):
            for b in content_blocks:
                if isinstance(b, dict) and b.get("type") == "text":
                    text_parts.append(b.get("text", ""))
        text = "\n".join(text_parts).strip() or ""
        out.append(
            MessageOut(
                id=r["id"],
                session_id=r["session_id"],
                role=r["role"],
                content=text,
                created_at=r["created_at"],
            )
        )
    return out
