"""Tests for the transactional email templates + skip behaviour.

We don't hit Resend over the network; we render the templates and verify the
critical bits (links, summary, recipient) without standing up the client.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import pytest

from app.services.email import (
    ResendClient,
    homeowner_confirmation,
    sales_notification,
)


@dataclass
class _StubAssessment:
    id: uuid.UUID
    lawn_area_sqft: float | None
    max_slope_pct: float | None
    grass_type_guesses: list[dict[str, Any]]
    gates: list[dict[str, Any]]


@dataclass
class _StubLead:
    id: uuid.UUID
    email: str
    phone: str | None
    preferred_contact: str
    notes: str | None


def _make_assessment() -> _StubAssessment:
    return _StubAssessment(
        id=uuid.uuid4(),
        lawn_area_sqft=8500,
        max_slope_pct=18,
        grass_type_guesses=[{"species": "Tall Fescue", "confidence": 0.9}],
        gates=[{"width_inches": 32}, {"width_inches": 36}],
    )


def _make_lead(assessment: _StubAssessment) -> _StubLead:
    return _StubLead(
        id=uuid.uuid4(),
        email="hello@example.com",
        phone="(555) 123-4567",
        preferred_contact="email",
        notes="Looking to install before summer.",
    )


def test_homeowner_confirmation_includes_results_link_and_summary() -> None:
    a = _make_assessment()
    msg = homeowner_confirmation(email="hello@example.com", assessment=a)
    assert msg.to == ["hello@example.com"]
    assert "ZippyLawnz" in msg.subject
    # Summary bits land in body.
    assert "8,500 sq ft" in msg.text
    assert "18% max slope" in msg.text
    assert "Tall Fescue" in msg.text
    assert 'narrowest gate 32"' in msg.text
    # Results link points at the public app.
    assert f"/assessment/{a.id}/results" in msg.text
    assert f"/assessment/{a.id}/results" in msg.html


def test_sales_notification_routes_to_sales_inbox() -> None:
    a = _make_assessment()
    lead = _make_lead(a)
    msg = sales_notification(lead=lead, assessment=a)
    assert len(msg.to) == 1
    assert "@" in msg.to[0]  # configured sales address
    # Subject line carries the recipient + summary so reps can triage from inbox.
    assert lead.email in msg.subject
    assert "8,500 sq ft" in msg.subject
    # Reply-to threads back to the homeowner.
    assert msg.reply_to == lead.email
    # Notes propagate.
    assert "Looking to install before summer" in msg.text


def test_homeowner_summary_falls_back_when_fields_missing() -> None:
    a = _StubAssessment(
        id=uuid.uuid4(),
        lawn_area_sqft=None,
        max_slope_pct=None,
        grass_type_guesses=[],
        gates=[],
    )
    msg = homeowner_confirmation(email="x@y.com", assessment=a)
    assert "summary not available" in msg.text


def test_resend_client_returns_none_without_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "resend_api_key", None)
    assert ResendClient.from_settings() is None
