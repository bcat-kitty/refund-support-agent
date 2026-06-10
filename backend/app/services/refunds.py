from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone

from . import eligibility, orders as orders_svc


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def issue(
    conn: sqlite3.Connection,
    *,
    order_id: str,
    amount: float,
    reason: str,
    session_id: str | None,
) -> dict:
    """Server-side re-check before issuing. Refuses if policy would not allow it.

    Returns either:
        {"status": "issued",   "refund_id": ..., "amount": ...}
        {"status": "refused",  "refused": True, "reason_code": ..., "explanation": ..., "policy_clauses": [...]}
        {"status": "escalated","refund_id": ..., "explanation": ...}  -- when caller hit issue but policy says escalate
    """
    verdict = eligibility.evaluate(conn, order_id, reason=reason)

    if verdict.action == "deny":
        return {
            "status": "refused",
            "refused": True,
            "reason_code": verdict.reasons[0] if verdict.reasons else "denied",
            "policy_clauses": verdict.policy_clauses,
            "explanation": verdict.explanation,
        }

    if verdict.action == "escalate":
        # Don't issue. Force the agent to call escalate_to_human instead.
        return {
            "status": "refused",
            "refused": True,
            "reason_code": "requires_escalation",
            "policy_clauses": verdict.policy_clauses,
            "explanation": (
                "issue_refund cannot process this case directly; per policy you must call "
                "escalate_to_human. " + verdict.explanation
            ),
        }

    max_allowed = round(verdict.eligible_total - orders_svc.already_refunded_total(conn, order_id), 2)
    if amount <= 0:
        return {
            "status": "refused",
            "refused": True,
            "reason_code": "invalid_amount",
            "policy_clauses": [],
            "explanation": "Refund amount must be greater than zero.",
        }
    if amount > max_allowed + 0.01:
        return {
            "status": "refused",
            "refused": True,
            "reason_code": "amount_exceeds_eligible",
            "policy_clauses": verdict.policy_clauses,
            "explanation": (
                f"Requested ${amount:.2f} exceeds the policy-eligible amount ${max_allowed:.2f}. "
                "Refund only the eligible portion; do not inflate the amount."
            ),
        }
    if amount > eligibility.ESCALATION_THRESHOLD_USD:
        # Belt-and-suspenders: even if verdict said auto, hard-cap here.
        return {
            "status": "refused",
            "refused": True,
            "reason_code": "over_500_threshold",
            "policy_clauses": ["§3.1"],
            "explanation": f"Refunds over ${eligibility.ESCALATION_THRESHOLD_USD:.0f} must be escalated (§3.1).",
        }

    refund_id = f"ref_{uuid.uuid4().hex[:10]}"
    now = _iso_now()
    conn.execute(
        "INSERT INTO refunds (id, order_id, amount, reason, status, decided_at, decided_by, trace_session_id)"
        " VALUES (?, ?, ?, ?, 'issued', ?, 'agent', ?)",
        (refund_id, order_id, round(amount, 2), reason or "", now, session_id),
    )

    return {
        "status": "issued",
        "refund_id": refund_id,
        "order_id": order_id,
        "amount": round(amount, 2),
        "decided_at": now,
        "policy_clauses": verdict.policy_clauses,
    }


def escalate(
    conn: sqlite3.Connection,
    *,
    order_id: str | None,
    summary: str,
    reason_code: str,
    session_id: str | None,
) -> dict:
    """Record an escalation. Stored as a refunds row with status='escalated' so admins see it."""
    ticket_id = f"esc_{uuid.uuid4().hex[:10]}"
    now = _iso_now()
    if order_id:
        conn.execute(
            "INSERT INTO refunds (id, order_id, amount, reason, status, decided_at, decided_by, trace_session_id)"
            " VALUES (?, ?, 0, ?, 'escalated', ?, 'agent', ?)",
            (ticket_id, order_id, f"[{reason_code}] {summary}", now, session_id),
        )
    return {
        "status": "escalated",
        "ticket_id": ticket_id,
        "order_id": order_id,
        "reason_code": reason_code,
        "summary": summary,
        "created_at": now,
        "next_step": "A human reviewer will follow up with the customer.",
    }
