from __future__ import annotations

import sqlite3


def list_for_customer(conn: sqlite3.Connection, customer_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM orders WHERE customer_id = ? ORDER BY ordered_at DESC",
        (customer_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_with_items(conn: sqlite3.Connection, order_id: str) -> dict | None:
    order_row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not order_row:
        return None
    order = dict(order_row)
    items = conn.execute(
        "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", (order_id,)
    ).fetchall()
    order["items"] = [dict(i) for i in items]
    return order


def already_refunded_total(conn: sqlite3.Connection, order_id: str) -> float:
    row = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM refunds"
        " WHERE order_id = ? AND status = 'issued'",
        (order_id,),
    ).fetchone()
    return float(row["total"] or 0)
