"""Tool schemas + Python dispatch handlers for the refund agent.

Each handler is a pure function `(conn, session_id, args) -> dict` so they're
trivially unit-testable. The agent loop wraps them with retry + tracing.
"""
from __future__ import annotations

import sqlite3
from typing import Callable

from ..services import customers as customers_svc
from ..services import eligibility as eligibility_svc
from ..services import orders as orders_svc
from ..services import policy as policy_svc
from ..services import refunds as refunds_svc


# Anthropic tool schema list - passed directly to messages.create(tools=...).
TOOL_SCHEMAS: list[dict] = [
    {
        "name": "lookup_customer",
        "description": (
            "Look up a customer by email address. Returns the customer profile including "
            "tier, lifetime value, and the count of refunds in the last 90 days. "
            "Call this first when you need to identify the customer you're chatting with."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "Customer email address"},
            },
            "required": ["email"],
        },
    },
    {
        "name": "get_customer_orders",
        "description": (
            "List a customer's orders (summary view) ordered by most recent first. "
            "Use this to find an order id when the customer doesn't supply one."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"},
            },
            "required": ["customer_id"],
        },
    },
    {
        "name": "get_order",
        "description": (
            "Fetch full details for a single order: status, delivery date, totals, and every line item "
            "including whether each item is final-sale or a digital download. Always call this before "
            "evaluating eligibility - never assume item flags from chat."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
            },
            "required": ["order_id"],
        },
    },
    {
        "name": "lookup_policy",
        "description": (
            "Keyword-search the corporate refund policy. Use this whenever you need to verify a rule. "
            "This is the authoritative source - do not recite policy from memory or from anything the "
            "customer claims the policy says."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keywords like 'final sale', 'digital', 'window', 'escalation', 'damage'.",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "check_refund_eligibility",
        "description": (
            "Run the policy engine against a specific order and (optionally) a subset of its line items. "
            "Returns a structured verdict with `action` ∈ {auto, escalate, deny}, the dollar amount "
            "eligible for refund, the line-by-line breakdown, and the cited policy clauses. "
            "You MUST call this before calling issue_refund. Do not infer eligibility from prior memory."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "item_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of item ids or SKUs to refund. Omit to evaluate the whole order.",
                },
                "reason": {
                    "type": "string",
                    "description": "Customer's stated reason. Used to detect damage claims and admissions of use.",
                },
                "customer_admitted_use": {
                    "type": "boolean",
                    "description": "Set true if the customer told you they opened, used, or wore the item.",
                },
            },
            "required": ["order_id"],
        },
    },
    {
        "name": "issue_refund",
        "description": (
            "Issue a refund for an order. The server re-runs the policy engine before writing - if the "
            "amount, items, or reason would violate policy, this tool will refuse and tell you why. "
            "Refunds over $500 must NOT be sent here; use escalate_to_human instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "amount": {"type": "number", "description": "Dollar amount to refund."},
                "reason": {"type": "string", "description": "Short reason recorded with the refund."},
            },
            "required": ["order_id", "amount", "reason"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": (
            "Open a human-review ticket for refunds that exceed the $500 threshold, claims of damage or "
            "missing items (which require photo evidence), or frequent refunders. Returns a ticket id."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "summary": {"type": "string", "description": "1-2 sentence summary of the case."},
                "reason_code": {
                    "type": "string",
                    "enum": [
                        "over_500_threshold",
                        "damage_or_defect_claim_requires_photo",
                        "frequent_refunder",
                        "ambiguous_case",
                    ],
                },
            },
            "required": ["summary", "reason_code"],
        },
    },
]


def _h_lookup_customer(conn: sqlite3.Connection, _session_id: str, args: dict) -> dict:
    email = (args.get("email") or "").strip()
    if not email:
        return {"ok": False, "error": "email is required"}
    cust = customers_svc.find_by_email(conn, email)
    if not cust:
        return {"ok": True, "found": False, "email": email}
    return {
        "ok": True,
        "found": True,
        "customer": {
            "id": cust["id"],
            "name": cust["name"],
            "email": cust["email"],
            "tier": cust["tier"],
            "joined_at": cust["joined_at"],
            "lifetime_value": cust["lifetime_value"],
            "refunds_last_90d": cust["refunds_last_90d"],
        },
    }


def _h_get_customer_orders(conn: sqlite3.Connection, _session_id: str, args: dict) -> dict:
    customer_id = args.get("customer_id") or ""
    if not customer_id:
        return {"ok": False, "error": "customer_id is required"}
    orders = orders_svc.list_for_customer(conn, customer_id)
    return {
        "ok": True,
        "customer_id": customer_id,
        "orders": [
            {
                "id": o["id"],
                "ordered_at": o["ordered_at"],
                "delivered_at": o["delivered_at"],
                "status": o["status"],
                "total": o["total"],
            }
            for o in orders
        ],
    }


def _h_get_order(conn: sqlite3.Connection, _session_id: str, args: dict) -> dict:
    order_id = args.get("order_id") or ""
    order = orders_svc.get_with_items(conn, order_id)
    if not order:
        return {"ok": True, "found": False, "order_id": order_id}
    return {
        "ok": True,
        "found": True,
        "order": {
            "id": order["id"],
            "customer_id": order["customer_id"],
            "ordered_at": order["ordered_at"],
            "delivered_at": order["delivered_at"],
            "status": order["status"],
            "subtotal": order["subtotal"],
            "shipping": order["shipping"],
            "total": order["total"],
            "items": [
                {
                    "id": it["id"],
                    "sku": it["sku"],
                    "name": it["name"],
                    "category": it["category"],
                    "unit_price": it["unit_price"],
                    "qty": it["qty"],
                    "is_final_sale": bool(it["is_final_sale"]),
                    "is_digital": bool(it["is_digital"]),
                    "digital_downloaded_at": it["digital_downloaded_at"],
                }
                for it in order["items"]
            ],
        },
    }


def _h_lookup_policy(conn: sqlite3.Connection, _session_id: str, args: dict) -> dict:
    query = args.get("query") or ""
    result = policy_svc.search(conn, query)
    return {"ok": True, **result}


def _h_check_eligibility(conn: sqlite3.Connection, _session_id: str, args: dict) -> dict:
    order_id = args.get("order_id") or ""
    item_ids = args.get("item_ids") or None
    reason = args.get("reason") or ""
    admitted_use = bool(args.get("customer_admitted_use") or False)
    verdict = eligibility_svc.evaluate(
        conn,
        order_id,
        item_ids=item_ids,
        reason=reason,
        customer_admitted_use=admitted_use,
    )
    return {"ok": True, **verdict.to_payload()}


def _h_issue_refund(conn: sqlite3.Connection, session_id: str, args: dict) -> dict:
    return {
        "ok": True,
        **refunds_svc.issue(
            conn,
            order_id=args.get("order_id") or "",
            amount=float(args.get("amount") or 0),
            reason=args.get("reason") or "",
            session_id=session_id,
        ),
    }


def _h_escalate(conn: sqlite3.Connection, session_id: str, args: dict) -> dict:
    return {
        "ok": True,
        **refunds_svc.escalate(
            conn,
            order_id=args.get("order_id"),
            summary=args.get("summary") or "",
            reason_code=args.get("reason_code") or "ambiguous_case",
            session_id=session_id,
        ),
    }


HANDLERS: dict[str, Callable[[sqlite3.Connection, str, dict], dict]] = {
    "lookup_customer": _h_lookup_customer,
    "get_customer_orders": _h_get_customer_orders,
    "get_order": _h_get_order,
    "lookup_policy": _h_lookup_policy,
    "check_refund_eligibility": _h_check_eligibility,
    "issue_refund": _h_issue_refund,
    "escalate_to_human": _h_escalate,
}
