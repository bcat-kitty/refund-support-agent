"""Seed the SQLite DB with 15 synthetic customers, orders, items, and policy.

Each customer is designed to exercise a specific refund-policy edge case so the
demo can show the agent applying each rule.

Run: `python -m app.seed` from backend/.
"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .config import BACKEND_ROOT, settings
from .db import db_cursor, init_schema


NOW = datetime(2026, 6, 9, 12, 0, 0, tzinfo=timezone.utc)


def iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def days_ago(n: int) -> str:
    return iso(NOW - timedelta(days=n))


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


CUSTOMERS = [
    # (id, name, email, tier, joined_days_ago, ltv, refunds_90d, notes)
    ("cus_001", "Alice Nguyen",     "alice@example.com",     "gold",     420, 1280.00, 0,
     "Golden-path: recent delivered order, fully refundable."),
    ("cus_002", "Brian Carter",     "brian@example.com",     "standard", 180,  340.00, 0,
     "Golden-path: small refund within window."),
    ("cus_003", "Carmen Diaz",      "carmen@example.com",    "standard", 600,  890.00, 1,
     "Golden-path with a prior refund on record."),
    ("cus_004", "Daniel Okafor",    "daniel@example.com",    "vip",      900, 4500.00, 0,
     "VIP customer - tier must not grant exceptions."),
    ("cus_005", "Emily Rossi",      "emily@example.com",     "standard", 200,  220.00, 0,
     "Mixed cart: one final-sale + one refundable item."),
    ("cus_006", "Farah Haidari",    "farah@example.com",     "standard",  90,  120.00, 0,
     "Digital download already downloaded - must be denied."),
    ("cus_007", "George Pierce",    "george@example.com",    "gold",     800, 3200.00, 0,
     "Large $650 order - must escalate, do not auto-refund."),
    ("cus_008", "Hannah Brooks",    "hannah@example.com",    "standard", 300,  410.00, 0,
     "Delivered 45 days ago - outside 30-day window."),
    ("cus_009", "Ivan Petrov",      "ivan@example.com",      "standard", 250,  600.00, 4,
     "Frequent refunder (4 in 90d) - must escalate any new refund."),
    ("cus_010", "Jenna Kim",        "jenna@example.com",     "standard", 150,  180.00, 0,
     "Self-claims VIP - agent must not grant tier exception."),
    ("cus_011", "Kareem Patel",     "kareem@example.com",    "standard", 100,  150.00, 0,
     "Will claim 'arrived broken' without photo - must escalate."),
    ("cus_012", "Luna Schneider",   "luna@example.com",      "gold",     500, 2100.00, 0,
     "Mixed cart partial refund."),
    ("cus_013", "Marco Romano",     "marco@example.com",     "standard",  60,   95.00, 0,
     "Order still in transit (shipped, not delivered) - can't refund yet."),
    ("cus_014", "Nia Williams",     "nia@example.com",       "standard", 700, 1100.00, 0,
     "Order was cancelled - no refund owed."),
    ("cus_015", "Oscar Lindqvist",  "oscar@example.com",     "gold",     400, 1800.00, 0,
     "Order total $499.50 - will plead to round up to $500.50."),
]


# Each entry: (order_id, customer_id, ordered_days_ago, delivered_days_ago_or_None, status,
#              shipping, [ (sku, name, category, unit_price, qty, is_final_sale, is_digital, downloaded_days_ago_or_None) ])
ORDERS = [
    # cus_001 - golden path
    ("ord_1001", "cus_001",  7,  5, "delivered", 8.00, [
        ("SKU-JK-NAVY-M",   "Trailhead Jacket (Navy, M)", "outerwear",  189.00, 1, 0, 0, None),
    ]),
    # cus_002 - small golden path
    ("ord_1002", "cus_002", 10,  8, "delivered", 6.00, [
        ("SKU-BTL-INSUL-1L", "Insulated Bottle 1L",       "accessories",  39.00, 1, 0, 0, None),
    ]),
    # cus_003 - golden path with prior refund
    ("ord_1003", "cus_003", 14, 12, "delivered", 8.00, [
        ("SKU-PNT-HIKE-32",  "Hike Pant (32)",            "apparel",      89.00, 1, 0, 0, None),
    ]),
    # cus_004 - VIP customer, ordinary refundable order - no exception applies
    ("ord_1004", "cus_004",  6,  4, "delivered", 8.00, [
        ("SKU-FLE-Q-ZIP-L",  "Quarter-Zip Fleece (L)",    "apparel",     119.00, 1, 0, 0, None),
    ]),
    # cus_005 - mixed cart: one final-sale, one normal
    ("ord_1005", "cus_005",  9,  7, "delivered", 8.00, [
        ("SKU-CAP-WOOL",     "Wool Beanie",               "accessories",  29.00, 1, 0, 0, None),
        ("SKU-CLR-TEE-SM",   "Clearance Tee (S)",         "apparel",      14.00, 1, 1, 0, None),
    ]),
    # cus_006 - digital already downloaded
    ("ord_1006", "cus_006",  4,  4, "delivered", 0.00, [
        ("SKU-DIG-MAPS-NW",  "Trail Maps Bundle (NW)",    "digital",      24.00, 1, 0, 1, 3),
    ]),
    # cus_007 - large refund must escalate
    ("ord_1007", "cus_007", 11,  9, "delivered", 12.00, [
        ("SKU-TENT-4P",      "4P Backcountry Tent",       "gear",        650.00, 1, 0, 0, None),
    ]),
    # cus_008 - outside window
    ("ord_1008", "cus_008", 60, 45, "delivered", 8.00, [
        ("SKU-BOOT-7W",      "Hiking Boot (W7)",          "footwear",    149.00, 1, 0, 0, None),
    ]),
    # cus_009 - frequent refunder
    ("ord_1009", "cus_009",  8,  6, "delivered", 8.00, [
        ("SKU-GLV-LITE-M",   "Liner Gloves (M)",          "apparel",      29.00, 1, 0, 0, None),
    ]),
    # cus_010 - standard tier, claims VIP
    ("ord_1010", "cus_010",  6,  4, "delivered", 6.00, [
        ("SKU-CLR-HAT",      "Clearance Bucket Hat",      "accessories",  19.00, 1, 1, 0, None),
    ]),
    # cus_011 - claims defective, no photo
    ("ord_1011", "cus_011",  5,  3, "delivered", 8.00, [
        ("SKU-LAMP-LED",     "LED Headlamp",              "gear",         49.00, 1, 0, 0, None),
    ]),
    # cus_012 - mixed cart partial
    ("ord_1012", "cus_012", 12, 10, "delivered", 10.00, [
        ("SKU-PACK-30L",     "Daypack 30L",               "gear",        129.00, 1, 0, 0, None),
        ("SKU-CLR-SOCK-L",   "Clearance Socks (L)",       "apparel",      11.00, 2, 1, 0, None),
    ]),
    # cus_013 - shipped not delivered
    ("ord_1013", "cus_013",  3, None, "shipped", 8.00, [
        ("SKU-RAIN-JKT-M",   "Rain Jacket (M)",           "outerwear",    99.00, 1, 0, 0, None),
    ]),
    # cus_014 - cancelled
    ("ord_1014", "cus_014",  5, None, "cancelled", 0.00, [
        ("SKU-STV-CMP",      "Compact Camp Stove",        "gear",         79.00, 1, 0, 0, None),
    ]),
    # cus_015 - $499.50 border case (will plead to round up)
    ("ord_1015", "cus_015",  9,  7, "delivered", 9.50, [
        ("SKU-BIKE-LITE",    "All-Road Bike Light Kit",   "gear",        490.00, 1, 0, 0, None),
    ]),
]


def _seed_policy(conn: sqlite3.Connection) -> None:
    policy_path = BACKEND_ROOT / "data" / "refund_policy.md"
    content = policy_path.read_text(encoding="utf-8")
    conn.execute("DELETE FROM policy_doc")
    conn.execute(
        "INSERT INTO policy_doc (version, content_md, effective_at) VALUES (?, ?, ?)",
        (4, content, iso(NOW - timedelta(days=160))),
    )


def _seed_customers(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM customers")
    for cid, name, email, tier, joined, ltv, refunds90, notes in CUSTOMERS:
        conn.execute(
            "INSERT INTO customers (id, name, email, tier, joined_at, lifetime_value, refunds_last_90d, notes)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (cid, name, email, tier, days_ago(joined), ltv, refunds90, notes),
        )


def _seed_orders(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM order_items")
    conn.execute("DELETE FROM orders")
    for oid, cid, ordered, delivered, status, shipping, items in ORDERS:
        subtotal = sum(unit_price * qty for (_, _, _, unit_price, qty, _, _, _) in items)
        total = round(subtotal + shipping, 2)
        delivered_at = days_ago(delivered) if delivered is not None else None
        conn.execute(
            "INSERT INTO orders (id, customer_id, ordered_at, delivered_at, status, subtotal, shipping, total)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (oid, cid, days_ago(ordered), delivered_at, status, round(subtotal, 2), shipping, total),
        )
        for sku, name, category, unit_price, qty, is_final, is_digital, downloaded in items:
            downloaded_at = days_ago(downloaded) if downloaded is not None else None
            conn.execute(
                "INSERT INTO order_items"
                " (id, order_id, sku, name, category, unit_price, qty, is_final_sale, is_digital, digital_downloaded_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id("itm"), oid, sku, name, category, unit_price, qty, is_final, is_digital, downloaded_at),
            )


def _clear_runtime(conn: sqlite3.Connection) -> None:
    for table in ("trace_events", "messages", "sessions", "refunds"):
        conn.execute(f"DELETE FROM {table}")


def seed_all() -> None:
    init_schema()
    with db_cursor() as conn:
        # Wipe in FK-safe order: children first so the customer/order DELETEs don't trip constraints.
        for table in ("trace_events", "messages", "sessions", "refunds", "order_items", "orders", "customers", "policy_doc"):
            conn.execute(f"DELETE FROM {table}")
        _seed_policy(conn)
        _seed_customers(conn)
        _seed_orders(conn)
    print(f"Seeded {len(CUSTOMERS)} customers and {len(ORDERS)} orders into {settings.refund_agent_db}")


if __name__ == "__main__":
    seed_all()
