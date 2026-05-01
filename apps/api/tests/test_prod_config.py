"""Production-config invariants — these are the env wiring bugs most likely
to slip past code review and into a deploy."""

from __future__ import annotations

import pytest

from app.core.config import DEV_SESSION_SECRET, Settings


def _prod_settings(**overrides: object) -> Settings:
    """Build a Settings(app_env=prod, ...) bypassing env-file lookup."""
    base: dict[str, object] = {
        "app_env": "prod",
        "session_cookie_secret": "x" * 64,
        "public_app_url": "https://app.roboticlawnz.com",
        "api_cors_origins": "https://app.roboticlawnz.com",
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_dev_defaults_are_fine() -> None:
    s = Settings(app_env="dev")  # type: ignore[arg-type]
    assert s.is_dev


def test_prod_happy_path_passes() -> None:
    s = _prod_settings()
    assert s.is_prod


def test_prod_rejects_default_session_secret() -> None:
    with pytest.raises(ValueError, match="SESSION_COOKIE_SECRET"):
        _prod_settings(session_cookie_secret=DEV_SESSION_SECRET)


def test_prod_rejects_short_session_secret() -> None:
    with pytest.raises(ValueError, match="32 bytes"):
        _prod_settings(session_cookie_secret="short")


def test_prod_rejects_http_app_url() -> None:
    with pytest.raises(ValueError, match="https"):
        _prod_settings(public_app_url="http://app.roboticlawnz.com")


def test_prod_rejects_localhost_cors() -> None:
    with pytest.raises(ValueError, match="localhost"):
        _prod_settings(api_cors_origins="http://localhost:3000")


def test_prod_collects_all_problems_in_one_error() -> None:
    with pytest.raises(ValueError) as exc:
        _prod_settings(
            session_cookie_secret=DEV_SESSION_SECRET,
            public_app_url="http://insecure",
            api_cors_origins="http://localhost:3000",
        )
    msg = str(exc.value)
    # All three issues should be present so the operator gets the full picture.
    assert "SESSION_COOKIE_SECRET" in msg
    assert "https" in msg
    assert "localhost" in msg
