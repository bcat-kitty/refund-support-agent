"""Tests for the issue_refund tool: the defense-in-depth boundary.

These verify that even if the model misuses the tool, the server-side re-check refuses.
"""
from app.db import get_connection
from app.services import refunds


def _conn():
    return get_connection()


def test_issue_refund_happy_path():
    res = refunds.issue(_conn(), order_id="ord_1001", amount=189.00, reason="changed mind", session_id=None)
    assert res["status"] == "issued"
    assert res["amount"] == 189.00


def test_issue_refund_refuses_final_sale_order():
    res = refunds.issue(_conn(), order_id="ord_1010", amount=19.00, reason="want it back", session_id=None)
    assert res.get("refused") is True
    assert res["reason_code"] == "final_sale"


def test_issue_refund_refuses_over_threshold():
    # ord_1007 is $662 - must escalate, not auto-issue.
    res = refunds.issue(_conn(), order_id="ord_1007", amount=662.00, reason="too pricey", session_id=None)
    assert res.get("refused") is True
    assert res["reason_code"] == "requires_escalation"


def test_issue_refund_refuses_amount_over_500_even_if_eligible_seemed_lower():
    # Belt-and-suspenders: any amount > 500 is refused.
    res = refunds.issue(_conn(), order_id="ord_1001", amount=600.00, reason="please", session_id=None)
    assert res.get("refused") is True


def test_issue_refund_refuses_inflated_amount():
    # Customer 1's eligible total is 189; refusing 250 because it exceeds eligible.
    res = refunds.issue(_conn(), order_id="ord_1001", amount=250.00, reason="round up", session_id=None)
    assert res.get("refused") is True
    assert res["reason_code"] == "amount_exceeds_eligible"


def test_issue_refund_refuses_outside_window():
    res = refunds.issue(_conn(), order_id="ord_1008", amount=149.00, reason="late return", session_id=None)
    assert res.get("refused") is True
    assert res["reason_code"] == "outside_window"


def test_escalate_records_ticket():
    res = refunds.escalate(
        _conn(),
        order_id="ord_1007",
        summary="$662 order over threshold",
        reason_code="over_500_threshold",
        session_id=None,
    )
    assert res["status"] == "escalated"
    assert res["ticket_id"].startswith("esc_")
