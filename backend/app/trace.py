from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


# Token prices in USD per 1M tokens for claude-sonnet-4-6. Used for trace cost display only.
PRICE_INPUT_PER_M = 3.00
PRICE_OUTPUT_PER_M = 15.00
PRICE_CACHE_WRITE_PER_M = 3.75
PRICE_CACHE_READ_PER_M = 0.30


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def estimate_cost(
    *,
    input_tokens: int,
    output_tokens: int,
    cache_read: int = 0,
    cache_write: int = 0,
) -> float:
    # input_tokens from Anthropic usage is net (cache reads/writes are separate fields).
    cost = (
        (input_tokens * PRICE_INPUT_PER_M)
        + (output_tokens * PRICE_OUTPUT_PER_M)
        + (cache_write * PRICE_CACHE_WRITE_PER_M)
        + (cache_read * PRICE_CACHE_READ_PER_M)
    ) / 1_000_000
    return round(cost, 6)


@dataclass
class TurnTally:
    step_count: int = 0
    tool_calls: int = 0
    retries: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    cache_read_in: int = 0
    cache_write_in: int = 0
    latency_ms: int = 0
    cost_usd: float = 0.0
    event_ids: list[str] = field(default_factory=list)


class TraceLogger:
    """Writes one row to trace_events per discrete agent step.

    A "step" is one of: llm_request, llm_response, tool_call, tool_result, tool_error,
    retry, escalation. Each row carries timing + token + cost details so the admin UI
    can render a complete audit trail without any external observability stack.
    """

    def __init__(self, conn: sqlite3.Connection, session_id: str, message_id: str | None):
        self.conn = conn
        self.session_id = session_id
        self.message_id = message_id
        self.tally = TurnTally()

    def _next_step(self) -> int:
        self.tally.step_count += 1
        return self.tally.step_count

    def _insert(self, **kwargs) -> str:
        event_id = f"trc_{uuid.uuid4().hex[:10]}"
        kwargs["id"] = event_id
        kwargs.setdefault("session_id", self.session_id)
        kwargs.setdefault("message_id", self.message_id)
        kwargs.setdefault("started_at", _iso_now())
        cols = ", ".join(kwargs.keys())
        placeholders = ", ".join(["?"] * len(kwargs))
        self.conn.execute(
            f"INSERT INTO trace_events ({cols}) VALUES ({placeholders})",
            tuple(kwargs.values()),
        )
        self.tally.event_ids.append(event_id)
        return event_id

    @staticmethod
    def _dumps(value) -> str | None:
        if value is None:
            return None
        try:
            return json.dumps(value, default=str)
        except Exception:
            return json.dumps(str(value))

    def log_llm_request(self, *, model: str, payload_preview: dict, started_at: str) -> str:
        return self._insert(
            step_index=self._next_step(),
            kind="llm_request",
            name=model,
            input_json=self._dumps(payload_preview),
            started_at=started_at,
        )

    def log_llm_response(
        self,
        *,
        model: str,
        stop_reason: str,
        content_blocks: list,
        usage: dict,
        latency_ms: int,
        started_at: str,
        ended_at: str,
    ) -> str:
        tokens_in = int(usage.get("input_tokens") or 0)
        tokens_out = int(usage.get("output_tokens") or 0)
        cache_read = int(usage.get("cache_read_input_tokens") or 0)
        cache_write = int(usage.get("cache_creation_input_tokens") or 0)
        cost = estimate_cost(
            input_tokens=tokens_in,
            output_tokens=tokens_out,
            cache_read=cache_read,
            cache_write=cache_write,
        )
        self.tally.tokens_in += tokens_in + cache_read + cache_write
        self.tally.tokens_out += tokens_out
        self.tally.cache_read_in += cache_read
        self.tally.cache_write_in += cache_write
        self.tally.latency_ms += latency_ms
        self.tally.cost_usd = round(self.tally.cost_usd + cost, 6)
        return self._insert(
            step_index=self._next_step(),
            kind="llm_response",
            name=model,
            input_json=None,
            output_json=self._dumps({"stop_reason": stop_reason, "content": content_blocks}),
            started_at=started_at,
            ended_at=ended_at,
            latency_ms=latency_ms,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cache_read_in=cache_read,
            cache_write_in=cache_write,
            cost_usd=cost,
        )

    def log_tool_call(self, *, name: str, args: dict, started_at: str) -> str:
        self.tally.tool_calls += 1
        return self._insert(
            step_index=self._next_step(),
            kind="tool_call",
            name=name,
            input_json=self._dumps(args),
            started_at=started_at,
        )

    def log_tool_result(
        self,
        *,
        name: str,
        result: dict,
        latency_ms: int,
        started_at: str,
        ended_at: str,
    ) -> str:
        return self._insert(
            step_index=self._next_step(),
            kind="tool_result",
            name=name,
            output_json=self._dumps(result),
            started_at=started_at,
            ended_at=ended_at,
            latency_ms=latency_ms,
        )

    def log_tool_error(
        self,
        *,
        name: str,
        error: str,
        latency_ms: int,
        started_at: str,
        ended_at: str,
    ) -> str:
        return self._insert(
            step_index=self._next_step(),
            kind="tool_error",
            name=name,
            error=error,
            started_at=started_at,
            ended_at=ended_at,
            latency_ms=latency_ms,
        )

    def log_retry(self, *, name: str, attempt: int, prior_error: str) -> str:
        self.tally.retries += 1
        return self._insert(
            step_index=self._next_step(),
            kind="retry",
            name=name,
            input_json=self._dumps({"attempt": attempt, "prior_error": prior_error}),
        )
