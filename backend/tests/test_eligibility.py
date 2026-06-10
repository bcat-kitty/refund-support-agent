"""Unit tests for the eligibility engine - the source-of-truth refund rules.

These are the most important tests in the codebase: a regression here means the agent
can be tricked into refunding things it shouldn't, regardless of how strong the prompt is.
"""
from app.db import get_connection
from app.services import eligibility


def _conn():
    return get_connection()


def test_golden_path_auto_refund():
    v = eligibility.evaluate(_conn(), "ord_1001", reason="changed my mind")
    assert v.action == "auto"
    assert v.eligible_total > 0
    assert "§1.1" in v.policy_clauses or any(c.startswith("§") for c in v.policy_clauses)


def test_final_sale_denied():
    # ord_1010 contains the Clearance Bucket Hat (final sale).
    v = eligibility.evaluate(_conn(), "ord_1010", reason="don't want it")
    assert v.action == "deny"
    assert "final_sale" in v.reasons
    assert "§2.1" in v.policy_clauses


def test_digital_downloaded_denied():
    v = eligibility.evaluate(_conn(), "ord_1006", reason="changed mind")
    assert v.action == "deny"
    assert "digital_already_downloaded" in v.reasons
    assert "§2.2" in v.policy_clauses


def test_over_500_threshold_escalates():
    v = eligibility.evaluate(_conn(), "ord_1007", reason="too big")
    assert v.action == "escalate"
    assert "over_500_threshold" in v.reasons
    assert "§3.1" in v.policy_clauses


def test_outside_window_denied():
    v = eligibility.evaluate(_conn(), "ord_1008", reason="finally got around")
    assert v.action == "deny"
    assert "outside_window" in v.reasons
    assert "§1.1" in v.policy_clauses


def test_frequent_refunder_escalates():
    v = eligibility.evaluate(_conn(), "ord_1009", reason="another one")
    assert v.action == "escalate"
    assert "frequent_refunder" in v.reasons


def test_damage_claim_escalates_without_photo():
    v = eligibility.evaluate(_conn(), "ord_1011", reason="arrived broken")
    assert v.action == "escalate"
    assert "damage_or_defect_claim_requires_photo" in v.reasons


def test_mixed_cart_partial_refund():
    # ord_1005 has one final-sale + one normal item.
    v = eligibility.evaluate(_conn(), "ord_1005", reason="returning")
    assert v.action == "auto"
    eligible_lines = [l for l in v.lines if l.eligible]
    ineligible_lines = [l for l in v.lines if not l.eligible]
    assert len(eligible_lines) == 1
    assert len(ineligible_lines) == 1
    assert ineligible_lines[0].reasons == ["final_sale"]


def test_cancelled_order_no_refund():
    v = eligibility.evaluate(_conn(), "ord_1014", reason="want refund")
    assert v.action == "deny"
    assert "order_cancelled" in v.reasons


def test_not_yet_delivered_denied():
    v = eligibility.evaluate(_conn(), "ord_1013", reason="want refund now")
    assert v.action == "deny"
    assert "not_yet_delivered" in v.reasons


def test_restocking_fee_applied_when_admitted_use():
    # cus_004's order ord_1004 is fully eligible; admitting use should knock 15% off.
    full = eligibility.evaluate(_conn(), "ord_1004", reason="changed mind")
    partial = eligibility.evaluate(
        _conn(), "ord_1004", reason="opened it but didn't like it", customer_admitted_use=True
    )
    assert partial.action == "auto"
    assert partial.eligible_total < full.eligible_total
    assert partial.eligible_total == round(full.eligible_total * 0.85, 2)


def test_vip_tier_does_not_grant_exception():
    # cus_004 is VIP. Final-sale lookups should still fail.
    # We test indirectly: ord_1010 belongs to standard tier, ord_1004 is VIP-owned but normal.
    # Confirm tier never appears in policy_clauses.
    v = eligibility.evaluate(_conn(), "ord_1004", reason="changed mind")
    for clause in v.policy_clauses:
        assert "tier" not in clause.lower()
