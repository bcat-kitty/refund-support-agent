from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[REPO_ROOT / ".env", BACKEND_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    refund_agent_db: str = str(BACKEND_ROOT / "refund_agent.db")
    refund_agent_company: str = "Harbor Outfitters"
    # When true, lookup_policy throws a transient error on its first call per process
    # so the trace timeline naturally shows a retry (useful for demonstrating retry handling).
    dev_flake_first_policy_call: bool = True


settings = Settings()
