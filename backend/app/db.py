import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    lifetime_value REAL NOT NULL DEFAULT 0,
    refunds_last_90d INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    ordered_at TEXT NOT NULL,
    delivered_at TEXT,
    status TEXT NOT NULL,
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price REAL NOT NULL,
    qty INTEGER NOT NULL,
    is_final_sale INTEGER NOT NULL DEFAULT 0,
    is_digital INTEGER NOT NULL DEFAULT 0,
    digital_downloaded_at TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    decided_at TEXT NOT NULL,
    decided_by TEXT NOT NULL,
    trace_session_id TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT,
    step_index INTEGER NOT NULL,
    kind TEXT NOT NULL,
    name TEXT,
    input_json TEXT,
    output_json TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    latency_ms INTEGER,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cache_read_in INTEGER,
    cache_write_in INTEGER,
    cost_usd REAL,
    error TEXT
);

CREATE TABLE IF NOT EXISTS policy_doc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    content_md TEXT NOT NULL,
    effective_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_session ON trace_events(session_id, step_index);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen_at DESC);
"""


def get_connection() -> sqlite3.Connection:
    Path(settings.refund_agent_db).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.refund_agent_db, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_schema() -> None:
    with db_cursor() as conn:
        conn.executescript(SCHEMA)


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None
