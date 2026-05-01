"""Settings sanity checks — primarily that env parsing doesn't blow up under
the dev defaults conftest sets."""

from __future__ import annotations

from app.core.config import Settings


def test_settings_parses_with_defaults() -> None:
    s = Settings()  # type: ignore[call-arg]
    assert s.app_env in {"dev", "staging", "prod"}
    assert s.api_port == 8000
    assert s.cors_origin_list == ["http://localhost:3000"]


def test_cors_origin_list_handles_csv() -> None:
    s = Settings(api_cors_origins="https://a.com, https://b.com,https://c.com")  # type: ignore[call-arg]
    assert s.cors_origin_list == ["https://a.com", "https://b.com", "https://c.com"]


def test_is_dev_flag() -> None:
    assert Settings(app_env="dev").is_dev is True  # type: ignore[call-arg]
    assert Settings(
        app_env="prod",
        api_cors_origins="https://roboticlawnz.com",
        public_app_url="https://roboticlawnz.com",
        session_cookie_secret="super-secret-ci-key-at-least-32-bytes!!",
    ).is_prod is True  # type: ignore[call-arg]
