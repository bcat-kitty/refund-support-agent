from __future__ import annotations

import re
import sqlite3
import threading

from ..config import settings


class TransientPolicyServiceError(RuntimeError):
    """Raised by the engineered dev-flake path so the trace shows a retried step."""


# Process-wide flake state. The first call per process raises TransientPolicyServiceError;
# the agent loop catches it, logs a retry, and the second call succeeds. This produces a
# clean, reproducible retry in the trace - the admin timeline can show
# a step that failed and then recovered.
_flake_lock = threading.Lock()
_flake_used = False


def _maybe_flake() -> None:
    global _flake_used
    if not settings.dev_flake_first_policy_call:
        return
    with _flake_lock:
        if _flake_used:
            return
        _flake_used = True
        raise TransientPolicyServiceError(
            "policy index warming up (simulated transient failure)"
        )


def reset_flake_for_tests() -> None:
    global _flake_used
    with _flake_lock:
        _flake_used = False


def get_current(conn: sqlite3.Connection) -> dict:
    row = conn.execute(
        "SELECT version, content_md, effective_at FROM policy_doc ORDER BY version DESC LIMIT 1"
    ).fetchone()
    if not row:
        raise RuntimeError("No policy document seeded. Run `python -m app.seed`.")
    return dict(row)


_SECTION_RE = re.compile(r"^##\s+\d+\.\s+.+$", re.MULTILINE)


def _split_sections(content_md: str) -> list[tuple[str, str]]:
    """Split policy markdown into (heading, body) tuples per top-level numbered section."""
    matches = list(_SECTION_RE.finditer(content_md))
    sections: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        heading = m.group(0).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content_md)
        body = content_md[start:end].strip()
        sections.append((heading, body))
    return sections


def search(conn: sqlite3.Connection, query: str) -> dict:
    """Keyword search over policy sections. Engineered to flake on first call (see _maybe_flake)."""
    _maybe_flake()
    doc = get_current(conn)
    sections = _split_sections(doc["content_md"])
    terms = [t.lower() for t in re.findall(r"[A-Za-z0-9$\-]+", query) if len(t) > 2]
    matches = []
    for heading, body in sections:
        haystack = (heading + "\n" + body).lower()
        score = sum(haystack.count(t) for t in terms)
        if score > 0:
            matches.append({"heading": heading, "body": body, "score": score})
    matches.sort(key=lambda m: m["score"], reverse=True)
    return {
        "version": doc["version"],
        "query": query,
        "matches": matches[:4] if matches else sections_as_dicts(sections[:3]),
    }


def sections_as_dicts(sections: list[tuple[str, str]]) -> list[dict]:
    return [{"heading": h, "body": b, "score": 0} for h, b in sections]
