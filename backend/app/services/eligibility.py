"""Refund eligibility engine - the single source of truth.

Both the agent's `check_refund_eligibility` tool and the `issue_refund` tool call
into `evaluate()`. This is the defense-in-depth boundary: even if the model is
jailbroken into calling `issue_refund` with a misleading reason, the refund tool
re-runs `evaluate()` against the actual DB and refuses if the rules say so.

The rule order mirrors the policy markdown in `data/refund_policy.md` so that
agent citations (e.g. "§2.1") are accurate.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from . import customers as customers_svc
from . import orders as orders_svc


ESCALATION_THRESHOLD_USD = 500.00
FREQUENT_REFUNDER_LIMIT = 3
RETURN_WINDOW_DAYS = 30
RESTOCK_FEE_RATE = 0.15


Action = Literal["auto", "escalate", "deny"]


@dataclass
class LineVerdict:
    item_id: str
    sku: str
    name: str
    eligible: bool
    refundable_amount: float
    reasons: list[str] = field(default_factory=list)


@dataclass
class EligibilityVerdict:
    order_id: str
    action: Action
    eligible_total: float
    reasons: list[str]
    lines: list[LineVerdict]
    policy_clauses: list[str]
    explanation: str

    def to_payload(self) -> dict:
        return {
            "order_id": self.order_id,
            "action": self.action,
            "eligible_total": round(self.eligible_total, 2),
            "reasons": self.reasons,
            "policy_clauses": self.policy_clauses,
            "explanation": self.explanation,
            "lines": [
                {
                    "item_id": line.item_id,
                    "sku": line.sku,
                    "name": line.name,
                    "eligible": line.eligible,
                    "refundable_amount": round(line.refundable_amount, 2),
                    "reasons": line.reasons,
                }
                for line in self.lines
            ],
        }


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def _now() -> datetime:
    # Fixed "today" matches the seed file's NOW so demos are deterministic.
    return datetime(2026, 6, 9, 12, 0, 0, tzinfo=timezone.utc)


def _days_since(value: str | None) -> int | None:
    dt = _parse_iso(value)
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (_now() - dt).days


def evaluate(
    conn: sqlite3.Connection,
    order_id: str,
    *,
    item_ids: list[str] | None = None,
    reason: str = "",
    customer_admitted_use: bool = False,
) -> EligibilityVerdict:
    """Return a structured verdict for the (order, items, reason) combination.

    Args:
        item_ids: if provided, only these line items are considered for refund.
            Pass None or empty list to consider all items.
        reason: free-text customer reason. We DO NOT trust this text for rule
            decisions - we only inspect it for damage/defective keywords and for
            customer-admits-use signals.
    """
    order = orders_svc.get_with_items(conn, order_id)
    if order is None:
        return EligibilityVerdict(
            order_id=order_id,
            action="deny",
            eligible_total=0.0,
            reasons=["order_not_found"],
            lines=[],
            policy_clauses=[],
            explanation=f"No order with id '{order_id}' exists.",
        )

    customer = customers_svc.find_by_id(conn, order["customer_id"])
    assert customer is not None

    reason_lower = (reason or "").lower()
    damage_keywords = ("damag", "broken", "defect", "missing", "wrong item", "arrived broken", "cracked")
    use_keywords = ("opened", "used", "worn", "wore", "tried")
    is_damage_claim = any(kw in reason_lower for kw in damage_keywords)
    self_reported_use = customer_admitted_use or any(kw in reason_lower for kw in use_keywords)

    reasons: list[str] = []
    clauses: list[str] = []

    # ----- Order-level gates (§1, §9) -----
    if order["status"] == "cancelled":
        return EligibilityVerdict(
            order_id=order_id,
            action="deny",
            eligible_total=0.0,
            reasons=["order_cancelled"],
            lines=[],
            policy_clauses=["§9.1"],
            explanation="Order was cancelled; the cancellation refund is processed automatically. No additional refund is owed.",
        )
    if order["status"] in {"placed", "shipped"} or order["delivered_at"] is None:
        return EligibilityVerdict(
            order_id=order_id,
            action="deny",
            eligible_total=0.0,
            reasons=["not_yet_delivered"],
            lines=[],
            policy_clauses=["§1.2"],
            explanation="Order has not been delivered yet. Refunds may only be requested after delivery.",
        )

    days = _days_since(order["delivered_at"])
    if days is not None and days > RETURN_WINDOW_DAYS:
        reasons.append("outside_window")
        clauses.append("§1.1")
        return EligibilityVerdict(
            order_id=order_id,
            action="deny",
            eligible_total=0.0,
            reasons=reasons,
            lines=[],
            policy_clauses=clauses,
            explanation=f"Delivered {days} days ago; return window is {RETURN_WINDOW_DAYS} days (§1.1).",
        )

    # ----- Damage / defective claims (§4) -----
    if is_damage_claim:
        return EligibilityVerdict(
            order_id=order_id,
            action="escalate",
            eligible_total=0.0,
            reasons=["damage_or_defect_claim_requires_photo"],
            lines=[],
            policy_clauses=["§4.1"],
            explanation="Claims of damage, defect, or missing items require photo evidence. The chat agent cannot accept images - escalate to a human reviewer (§4.1).",
        )

    # ----- Frequent refunder (§5) -----
    if (customer["refunds_last_90d"] or 0) >= FREQUENT_REFUNDER_LIMIT:
        return EligibilityVerdict(
            order_id=order_id,
            action="escalate",
            eligible_total=0.0,
            reasons=["frequent_refunder"],
            lines=[],
            policy_clauses=["§5.1"],
            explanation=f"Customer has {customer['refunds_last_90d']} refunds in the last 90 days; any further refund must be escalated to a human reviewer (§5.1).",
        )

    # ----- Per-line evaluation (§2, §6, §7) -----
    selected_items = order["items"]
    if item_ids:
        wanted = {i for i in item_ids}
        selected_items = [it for it in order["items"] if it["id"] in wanted or it["sku"] in wanted]
        if not selected_items:
            return EligibilityVerdict(
                order_id=order_id,
                action="deny",
                eligible_total=0.0,
                reasons=["items_not_found_in_order"],
                lines=[],
                policy_clauses=[],
                explanation="None of the requested items belong to this order.",
            )

    line_verdicts: list[LineVerdict] = []
    eligible_total = 0.0

    for item in selected_items:
        line_reasons: list[str] = []
        refundable_amount = 0.0
        line_eligible = True

        if item["is_final_sale"]:
            line_reasons.append("final_sale")
            line_eligible = False
            clauses.append("§2.1")
        elif item["is_digital"] and item["digital_downloaded_at"]:
            line_reasons.append("digital_already_downloaded")
            line_eligible = False
            clauses.append("§2.2")
        else:
            gross = float(item["unit_price"]) * int(item["qty"])
            if self_reported_use:
                refundable_amount = round(gross * (1 - RESTOCK_FEE_RATE), 2)
                line_reasons.append("restock_fee_15pct")
                clauses.append("§6.1")
            else:
                refundable_amount = round(gross, 2)
            eligible_total += refundable_amount

        line_verdicts.append(
            LineVerdict(
                item_id=item["id"],
                sku=item["sku"],
                name=item["name"],
                eligible=line_eligible,
                refundable_amount=refundable_amount,
                reasons=line_reasons,
            )
        )

    eligible_total = round(eligible_total, 2)

    # Account for any prior issued refunds on this order - defense in depth.
    already_paid = orders_svc.already_refunded_total(conn, order_id)
    if already_paid > 0:
        clauses.append("§9.1")
        reasons.append("partial_already_refunded")

    if eligible_total <= 0:
        # No refundable lines at all - denial summary.
        denial_reasons = sorted({r for lv in line_verdicts for r in lv.reasons})
        return EligibilityVerdict(
            order_id=order_id,
            action="deny",
            eligible_total=0.0,
            reasons=denial_reasons or ["no_eligible_items"],
            lines=line_verdicts,
            policy_clauses=sorted(set(clauses)),
            explanation="None of the selected items are refundable under the current policy.",
        )

    # ----- Escalation threshold (§3) -----
    if eligible_total > ESCALATION_THRESHOLD_USD:
        reasons.append("over_500_threshold")
        clauses.append("§3.1")
        return EligibilityVerdict(
            order_id=order_id,
            action="escalate",
            eligible_total=eligible_total,
            reasons=reasons,
            lines=line_verdicts,
            policy_clauses=sorted(set(clauses)),
            explanation=f"Refund total ${eligible_total:.2f} exceeds the ${ESCALATION_THRESHOLD_USD:.0f} threshold and must be escalated to a human reviewer (§3.1).",
        )

    # ----- Auto-approve -----
    summary_reasons = sorted({r for lv in line_verdicts for r in lv.reasons}) + reasons
    return EligibilityVerdict(
        order_id=order_id,
        action="auto",
        eligible_total=eligible_total,
        reasons=summary_reasons,
        lines=line_verdicts,
        policy_clauses=sorted(set(clauses)) or ["§1.1"],
        explanation=f"Refund of ${eligible_total:.2f} is within policy and may be auto-issued.",
    )
