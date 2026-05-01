"""Smoke tests for the rate-limit module — verifies the key derivation and
that the policy constants are sane bands (not e.g. 0/minute by accident)."""

from __future__ import annotations

import re

import pytest

from app.core import rate_limit as rl


def _make_request(cookies: dict[str, str] | None = None, ip: str = "203.0.113.7"):  # type: ignore[no-untyped-def]
    """Tiny stand-in for a Starlette Request — enough for `_key_func`."""

    class _Client:
        def __init__(self, host: str) -> None:
            self.host = host

    class _Request:
        def __init__(self, cookies: dict[str, str], host: str) -> None:
            self.cookies = cookies
            self.client = _Client(host)
            self.headers = {}
            self.scope = {"client": (host, 0)}

    return _Request(cookies or {}, ip)


def test_key_func_uses_session_cookie_when_present() -> None:
    req = _make_request(cookies={"rl_session": "signed-token"})
    key = rl._key_func(req)  # type: ignore[arg-type]
    assert key.startswith("sess:")
    assert len(key) == len("sess:") + 16


def test_key_func_falls_back_to_ip_when_no_cookie() -> None:
    req = _make_request(ip="198.51.100.42")
    key = rl._key_func(req)  # type: ignore[arg-type]
    assert key.startswith("ip:")
    assert "198.51.100.42" in key


@pytest.mark.parametrize(
    "policy",
    [
        rl.CREATE_ASSESSMENT_LIMIT,
        rl.COMPLETE_ASSESSMENT_LIMIT,
        rl.CAPTURE_LEAD_LIMIT,
        rl.ML_INFERENCE_LIMIT,
        rl.SLOPE_SAMPLE_LIMIT,
        rl.ADMIN_WRITE_LIMIT,
    ],
)
def test_policy_strings_are_well_formed(policy: str) -> None:
    """Every policy follows slowapi's `<n>/<period>` shape with n > 0."""
    m = re.match(r"^(\d+)/(second|minute|hour|day)$", policy)
    assert m, f"policy {policy!r} doesn't parse"
    assert int(m.group(1)) > 0


def test_strict_policies_more_restrictive_than_admin_writes() -> None:
    """Sanity: lead capture and ML inference are tighter than admin writes."""

    def per_minute(p: str) -> float:
        n, _, period = p.partition("/")
        return {"second": 60, "minute": 1, "hour": 1 / 60, "day": 1 / (60 * 24)}[period] * int(n)

    assert per_minute(rl.CAPTURE_LEAD_LIMIT) < per_minute(rl.ADMIN_WRITE_LIMIT)
    assert per_minute(rl.ML_INFERENCE_LIMIT) < per_minute(rl.ADMIN_WRITE_LIMIT)
