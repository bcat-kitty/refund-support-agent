"""Smoke tests for the agent's tool dispatch handlers (no LLM involved)."""
from app.agent import tools
from app.db import get_connection


def _call(name, args, session_id="ses_test"):
    return tools.HANDLERS[name](get_connection(), session_id, args)


def test_lookup_customer_found():
    res = _call("lookup_customer", {"email": "alice@example.com"})
    assert res["ok"] and res["found"] is True
    assert res["customer"]["id"] == "cus_001"


def test_lookup_customer_not_found():
    res = _call("lookup_customer", {"email": "ghost@example.com"})
    assert res["ok"] and res["found"] is False


def test_get_customer_orders():
    res = _call("get_customer_orders", {"customer_id": "cus_001"})
    assert res["ok"]
    assert any(o["id"] == "ord_1001" for o in res["orders"])


def test_get_order_with_items():
    res = _call("get_order", {"order_id": "ord_1005"})
    assert res["ok"] and res["found"]
    skus = [it["sku"] for it in res["order"]["items"]]
    assert "SKU-CLR-TEE-SM" in skus


def test_check_eligibility_through_tool():
    res = _call("check_refund_eligibility", {"order_id": "ord_1001", "reason": "changed mind"})
    assert res["ok"]
    assert res["action"] == "auto"


def test_issue_refund_through_tool_refuses_over_threshold():
    res = _call(
        "issue_refund", {"order_id": "ord_1007", "amount": 662.00, "reason": "size mismatch"}
    )
    assert res.get("refused") is True


def test_lookup_policy_returns_matches():
    res = _call("lookup_policy", {"query": "final sale"})
    assert res["ok"]
    assert len(res["matches"]) > 0
    assert any("2." in m["heading"] for m in res["matches"])
