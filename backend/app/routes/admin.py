from __future__ import annotations

import json

from fastapi import APIRouter

from ..db import db_cursor
from ..schemas import (
    CustomerOut,
    PolicyOut,
    SessionSummaryOut,
    TraceEventOut,
)


router = APIRouter(tags=["admin"])


def _maybe_json(value: str | None):
    if value is None:
        return None
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return value


@router.get("/customers", response_model=list[CustomerOut])
def list_customers():
    with db_cursor() as conn:
        rows = conn.execute("SELECT * FROM customers ORDER BY id").fetchall()
    return [CustomerOut(**dict(r)) for r in rows]


@router.get("/sessions", response_model=list[SessionSummaryOut])
def list_sessions():
    with db_cursor() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.customer_id, s.created_at, s.last_seen_at,
                   c.name AS customer_name, c.email AS customer_email,
                   (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
                   (SELECT m.content FROM messages m
                     WHERE m.session_id = s.id AND m.role = 'user'
                     ORDER BY m.created_at DESC LIMIT 1) AS last_user_content
            FROM sessions s
            JOIN customers c ON c.id = s.customer_id
            ORDER BY s.last_seen_at DESC
            """
        ).fetchall()
    out: list[SessionSummaryOut] = []
    for r in rows:
        last = None
        if r["last_user_content"]:
            try:
                blocks = json.loads(r["last_user_content"])
                for b in blocks if isinstance(blocks, list) else []:
                    if isinstance(b, dict) and b.get("type") == "text":
                        last = (b.get("text") or "").strip()
                        break
            except (TypeError, ValueError):
                last = None
            if last:
                # Strip session-context preamble if it was prepended.
                marker = "Customer says:\n"
                if marker in last:
                    last = last.split(marker, 1)[1].strip()
                if len(last) > 120:
                    last = last[:117] + "…"
        out.append(
            SessionSummaryOut(
                id=r["id"],
                customer_id=r["customer_id"],
                customer_name=r["customer_name"],
                customer_email=r["customer_email"],
                created_at=r["created_at"],
                last_seen_at=r["last_seen_at"],
                message_count=r["message_count"],
                last_user_message=last,
            )
        )
    return out


@router.get("/sessions/{session_id}/trace", response_model=list[TraceEventOut])
def get_trace(session_id: str):
    with db_cursor() as conn:
        rows = conn.execute(
            "SELECT * FROM trace_events WHERE session_id = ? ORDER BY step_index, id",
            (session_id,),
        ).fetchall()
    out: list[TraceEventOut] = []
    for r in rows:
        d = dict(r)
        out.append(
            TraceEventOut(
                id=d["id"],
                session_id=d["session_id"],
                message_id=d["message_id"],
                step_index=d["step_index"],
                kind=d["kind"],
                name=d["name"],
                input=_maybe_json(d["input_json"]),
                output=_maybe_json(d["output_json"]),
                started_at=d["started_at"],
                ended_at=d["ended_at"],
                latency_ms=d["latency_ms"],
                tokens_in=d["tokens_in"],
                tokens_out=d["tokens_out"],
                cache_read_in=d["cache_read_in"],
                cache_write_in=d["cache_write_in"],
                cost_usd=d["cost_usd"],
                error=d["error"],
            )
        )
    return out


@router.get("/policy", response_model=PolicyOut)
def get_policy():
    with db_cursor() as conn:
        row = conn.execute(
            "SELECT version, content_md, effective_at FROM policy_doc ORDER BY version DESC LIMIT 1"
        ).fetchone()
    return PolicyOut(version=row["version"], content_md=row["content_md"], effective_at=row["effective_at"])
