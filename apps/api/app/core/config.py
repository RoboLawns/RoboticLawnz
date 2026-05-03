"""Centralised app config. All env access goes through `settings`."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SESSION_SECRET = "dev-only-secret-replace-in-prod"


class Settings(BaseSettings):
    """Validated application settings loaded from env / .env file.

    In `prod`, the `_prod_invariants` validator fails fast on start-up if
    critical secrets are missing or still set to development defaults — this
    catches "forgot to wire the env var" bugs before traffic hits us.
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Runtime ---
    app_env: Literal["dev", "staging", "prod"] = "dev"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: str = "http://localhost:3000"
    public_app_url: str = "http://localhost:3000"

    # --- Database ---
    database_url: str = Field(
        default="postgresql+psycopg://zippylawnz:zippylawnz@localhost:5432/zippylawnz",
        description="Async / sync SQLAlchemy URL — psycopg3 driver supports both.",
    )
    sync_database_url: str | None = None

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Auth (Clerk) ---
    clerk_secret_key: SecretStr | None = None
    clerk_jwks_url: str | None = None
    clerk_webhook_secret: SecretStr | None = None

    # --- Sessions / signed cookies ---
    session_cookie_secret: SecretStr = SecretStr(DEV_SESSION_SECRET)
    session_cookie_name: str = "rl_session"
    session_cookie_max_age_days: int = 30

    # --- ML (Replicate) ---
    replicate_api_token: SecretStr | None = None
    sam2_model_version: str | None = None
    grass_classifier_model_version: str | None = None

    # --- Maps ---
    google_maps_api_key: SecretStr | None = None

    # --- Email (Resend) ---
    resend_api_key: SecretStr | None = None
    sales_inbox_email: str = "sales@zippylawnz.com"
    from_email: str = "hello@zippylawnz.com"

    # --- Storage (Cloudflare R2) ---
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: SecretStr | None = None
    r2_bucket: str = "zippylawnz-uploads"
    r2_public_base_url: str | None = None

    # --- Observability ---
    sentry_dsn: str | None = None
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env == "dev"

    @property
    def is_prod(self) -> bool:
        return self.app_env == "prod"

    @model_validator(mode="after")
    def _prod_invariants(self) -> Settings:
        """In prod, fail fast if any of these are missing or unsafe.

        Optional integrations (Replicate, Resend, R2) intentionally do NOT
        appear here — the routers / services degrade gracefully when they're
        not configured, which is fine for a soft launch.
        """
        if self.app_env != "prod":
            return self

        problems: list[str] = []

        if self.session_cookie_secret.get_secret_value() == DEV_SESSION_SECRET:
            problems.append(
                "SESSION_COOKIE_SECRET is still the development default — "
                "set it to 32+ random bytes"
            )
        if len(self.session_cookie_secret.get_secret_value()) < 32:
            problems.append("SESSION_COOKIE_SECRET must be at least 32 bytes in prod")

        if self.public_app_url.startswith("http://"):
            problems.append("PUBLIC_APP_URL must use https in prod")

        if "localhost" in self.api_cors_origins:
            problems.append("API_CORS_ORIGINS still contains 'localhost' — set the prod domain")

        # We accept missing Clerk keys at boot (anonymous flow still works),
        # but warn loudly via the log on first request — see security.py.

        if problems:
            raise ValueError(
                "production config invalid:\n  - " + "\n  - ".join(problems)
            )

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor — use everywhere except inside Settings itself."""
    return Settings()


settings = get_settings()
