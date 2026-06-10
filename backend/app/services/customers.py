from __future__ import annotations

import sqlite3


def find_by_email(conn: sqlite3.Connection, email: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM customers WHERE lower(email) = lower(?)",
        (email.strip(),),
    ).fetchone()
    return dict(row) if row else None


def find_by_id(conn: sqlite3.Connection, customer_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    return dict(row) if row else None


def list_all(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM customers ORDER BY id").fetchall()
    return [dict(r) for r in rows]
