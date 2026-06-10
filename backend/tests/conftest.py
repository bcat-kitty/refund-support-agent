import os
import tempfile
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    """Each test gets its own SQLite file + fresh seed, with policy flake disabled by default."""
    tmpdir = tempfile.mkdtemp(prefix="refund-agent-test-")
    db_path = Path(tmpdir) / "test.db"
    monkeypatch.setenv("REFUND_AGENT_DB", str(db_path))
    monkeypatch.setenv("DEV_FLAKE_FIRST_POLICY_CALL", "false")
    # Mutate the singleton settings in place so existing `from .config import settings`
    # bindings in other modules see the new values.
    from app import config as config_module
    config_module.settings.refund_agent_db = str(db_path)
    config_module.settings.dev_flake_first_policy_call = False
    from app import db as db_module
    from app.services import policy as policy_module
    policy_module.reset_flake_for_tests()
    db_module.init_schema()
    from app.seed import seed_all
    seed_all()
    yield db_path
    try:
        for p in db_path.parent.glob("*"):
            try:
                p.unlink()
            except FileNotFoundError:
                pass
        os.rmdir(tmpdir)
    except OSError:
        pass
