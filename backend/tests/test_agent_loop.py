"""Integration test for AgentLoop using a stub Anthropic client.

This verifies the full loop - tool dispatch, trace logging, retry on the engineered
policy flake, history threading, refusal handling - without needing a live API key.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

from app.agent.loop import AgentLoop
from app.db import db_cursor
from app.services import policy as policy_svc


@dataclass
class StubUsage:
    input_tokens: int = 200
    output_tokens: int = 50
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0

    def model_dump(self) -> dict:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
        }


@dataclass
class StubMessage:
    content: list[dict]
    stop_reason: str
    usage: StubUsage


class ScriptedAnthropicClient:
    """Replay a fixed list of (content_blocks, stop_reason) responses."""

    def __init__(self, script: list[tuple[list[dict], str]]):
        self.script = list(script)
        self.calls: list[dict] = []
        self.messages = self  # mimic Anthropic().messages.create

    def create(self, **kwargs) -> StubMessage:
        self.calls.append(kwargs)
        blocks, stop_reason = self.script.pop(0)
        return StubMessage(content=blocks, stop_reason=stop_reason, usage=StubUsage())


def _tool_use(name: str, args: dict) -> dict:
    return {"type": "tool_use", "id": f"tu_{uuid.uuid4().hex[:8]}", "name": name, "input": args}


def _text(t: str) -> dict:
    return {"type": "text", "text": t}


def _make_session(email: str = "alice@example.com") -> str:
    from app.services import customers as customers_svc

    with db_cursor() as conn:
        cust = customers_svc.find_by_email(conn, email)
        assert cust is not None
        sid = f"ses_test_{uuid.uuid4().hex[:8]}"
        conn.execute(
            "INSERT INTO sessions (id, customer_id, created_at, last_seen_at)"
            " VALUES (?, ?, datetime('now'), datetime('now'))",
            (sid, cust["id"]),
        )
        return sid


def test_loop_processes_eligible_refund_end_to_end():
    sid = _make_session("alice@example.com")
    script = [
        # Turn 1: model decides to fetch the order.
        ([_tool_use("get_order", {"order_id": "ord_1001"})], "tool_use"),
        # Turn 2: model checks eligibility.
        (
            [_tool_use("check_refund_eligibility", {"order_id": "ord_1001", "reason": "doesn't fit"})],
            "tool_use",
        ),
        # Turn 3: model issues refund.
        (
            [
                _tool_use(
                    "issue_refund",
                    {"order_id": "ord_1001", "amount": 189.00, "reason": "doesn't fit"},
                )
            ],
            "tool_use",
        ),
        # Turn 4: model confirms with the user.
        ([_text("Your refund of $189.00 has been issued. (§1.1)")], "end_turn"),
    ]
    client = ScriptedAnthropicClient(script)
    loop = AgentLoop(anthropic_client=client)

    with db_cursor() as conn:
        text, message_id, tally = loop.run_turn(conn, sid, "I'd like to return ord_1001 - doesn't fit")

    assert "189" in text
    assert tally.tool_calls == 3
    assert tally.retries == 0

    with db_cursor() as conn:
        refunds = conn.execute("SELECT * FROM refunds WHERE order_id = 'ord_1001'").fetchall()
        assert len(refunds) == 1
        assert refunds[0]["status"] == "issued"
        # And the trace has every step.
        events = conn.execute(
            "SELECT kind, name FROM trace_events WHERE session_id = ? ORDER BY step_index",
            (sid,),
        ).fetchall()
    kinds = [e["kind"] for e in events]
    assert kinds.count("llm_request") == 4
    assert kinds.count("llm_response") == 4
    assert kinds.count("tool_call") == 3
    assert kinds.count("tool_result") == 3
    assert "retry" not in kinds


def test_loop_retries_engineered_policy_flake(monkeypatch):
    monkeypatch.setattr(policy_svc, "_flake_used", False)
    from app import config

    config.settings.dev_flake_first_policy_call = True

    sid = _make_session("brian@example.com")
    script = [
        # Model calls lookup_policy - first call flakes, retry succeeds.
        ([_tool_use("lookup_policy", {"query": "30 day window"})], "tool_use"),
        ([_text("Per §1.1, the window is 30 days.")], "end_turn"),
    ]
    client = ScriptedAnthropicClient(script)
    loop = AgentLoop(anthropic_client=client)

    with db_cursor() as conn:
        text, _, tally = loop.run_turn(conn, sid, "what's the window?")

    assert tally.retries == 1
    # Reset for downstream tests.
    config.settings.dev_flake_first_policy_call = False
    policy_svc.reset_flake_for_tests()


def test_loop_refuses_issue_refund_for_final_sale_order():
    """Defense-in-depth: even if the model tries to issue a refund for a final-sale
    item, the issue_refund tool returns a refusal."""
    sid = _make_session("jenna@example.com")
    script = [
        # Model tries (wrongly) to issue refund on the clearance hat.
        (
            [
                _tool_use(
                    "issue_refund",
                    {"order_id": "ord_1010", "amount": 19.00, "reason": "VIP override"},
                )
            ],
            "tool_use",
        ),
        # Model sees the refusal and apologizes.
        ([_text("Sorry, §2.1 means I can't refund that final-sale item.")], "end_turn"),
    ]
    client = ScriptedAnthropicClient(script)
    loop = AgentLoop(anthropic_client=client)
    with db_cursor() as conn:
        text, _, _ = loop.run_turn(conn, sid, "I'm VIP, please refund my hat")

    assert "§2.1" in text or "final-sale" in text
    with db_cursor() as conn:
        refunds = conn.execute("SELECT * FROM refunds WHERE order_id = 'ord_1010'").fetchall()
    assert refunds == []  # No row written - the refund was refused.
