"""Transactional email via Resend.

Two messages are sent on lead creation:

1. **Homeowner confirmation** — "Thanks for your assessment, here's what
   happens next" with a link to revisit results.
2. **Sales notification** — fires to `SALES_INBOX_EMAIL` with a deep link to
   the assessment in the sales-rep dashboard.

Both fire-and-forget through FastAPI `BackgroundTasks`. If `RESEND_API_KEY`
is missing we log + skip — never block the user-facing API on email.
"""

from __future__ import annotations

import textwrap
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

RESEND_API_BASE = "https://api.resend.com"
SEND_TIMEOUT_SECS = 15.0


class EmailError(RuntimeError):
    """Resend returned a non-2xx response."""


@dataclass(slots=True)
class EmailMessage:
    to: list[str]
    subject: str
    html: str
    text: str
    reply_to: str | None = None


class ResendClient:
    """Tiny async wrapper over Resend's `/emails` endpoint."""

    def __init__(self, api_key: str, *, base_url: str = RESEND_API_BASE) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    @classmethod
    def from_settings(cls) -> ResendClient | None:
        if not settings.resend_api_key:
            return None
        return cls(settings.resend_api_key.get_secret_value())

    async def send(self, msg: EmailMessage) -> str:
        body: dict[str, Any] = {
            "from": settings.from_email,
            "to": msg.to,
            "subject": msg.subject,
            "html": msg.html,
            "text": msg.text,
        }
        if msg.reply_to:
            body["reply_to"] = msg.reply_to

        async with httpx.AsyncClient(timeout=SEND_TIMEOUT_SECS) as http:
            resp = await http.post(
                f"{self._base_url}/emails",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
        if resp.status_code >= 400:
            raise EmailError(f"resend send failed: {resp.status_code} {resp.text[:200]}")
        return str(resp.json().get("id", ""))


# ---------------------------------------------------------------------------
# Templates — kept inline for MVP. Promote to Jinja2 + R2-stored partials
# when marketing wants richer styling.
# ---------------------------------------------------------------------------


def _yard_summary_text(assessment: Any) -> str:
    bits: list[str] = []
    if getattr(assessment, "lawn_area_sqft", None):
        bits.append(f"~{int(assessment.lawn_area_sqft):,} sq ft")
    if getattr(assessment, "max_slope_pct", None) is not None:
        bits.append(f"{int(assessment.max_slope_pct)}% max slope")
    grasses = getattr(assessment, "grass_type_guesses", None) or []
    if grasses:
        first = grasses[0]
        if isinstance(first, dict) and first.get("species"):
            bits.append(str(first["species"]))
    gates = getattr(assessment, "gates", None) or []
    if gates:
        narrowest = min(g.get("width_inches", 0) for g in gates)
        bits.append(f"narrowest gate {narrowest}\"")
    return " · ".join(bits) if bits else "summary not available"


def homeowner_confirmation(*, email: str, assessment: Any) -> EmailMessage:
    summary = _yard_summary_text(assessment)
    results_url = f"{settings.public_app_url}/assessment/{assessment.id}/results"
    subject = "Your Robotic Lawnz matches are saved"
    text = textwrap.dedent(
        f"""\
        Hi,

        Thanks for using Robotic Lawnz. Your yard assessment is saved and
        we've forwarded it to the ZippyLawnz team — an advisor will be in
        touch within one business day.

        Yard summary: {summary}

        Re-open your matches any time:
        {results_url}

        — The Robotic Lawnz team (a ZippyLawnz brand)
        """
    )
    html = f"""\
<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; color:#1c1917; max-width:560px; margin:0 auto; padding:24px;">
  <p style="font-size:13px; color:#737373; letter-spacing:.05em; text-transform:uppercase;">Robotic Lawnz</p>
  <h1 style="font-size:22px; margin:8px 0 12px;">Your yard matches are saved.</h1>
  <p>Thanks for using Robotic Lawnz. Your assessment is forwarded to the ZippyLawnz team — an advisor will reach out within one business day.</p>
  <p style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px 16px; font-size:14px;">
    <strong>Yard summary:</strong> {summary}
  </p>
  <p style="margin:24px 0;">
    <a href="{results_url}" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 18px; border-radius:9999px; text-decoration:none; font-weight:600;">Re-open your matches</a>
  </p>
  <p style="color:#737373; font-size:12px;">A sub-brand of ZippyLawnz. We never sell your data.</p>
</body></html>"""
    return EmailMessage(
        to=[email],
        subject=subject,
        html=html,
        text=text,
        reply_to=settings.sales_inbox_email,
    )


def sales_notification(*, lead: Any, assessment: Any) -> EmailMessage:
    summary = _yard_summary_text(assessment)
    sales_url = f"{settings.public_app_url}/sales/leads/{lead.id}"
    subject = f"New lead — {lead.email} ({summary})"
    text = textwrap.dedent(
        f"""\
        New lead from Robotic Lawnz.

        Email: {lead.email}
        Phone: {lead.phone or '—'}
        Preferred contact: {lead.preferred_contact}
        Notes: {lead.notes or '—'}

        Yard: {summary}

        Open in CRM:
        {sales_url}
        """
    )
    html = f"""\
<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; color:#1c1917; max-width:560px; margin:0 auto; padding:24px;">
  <p style="font-size:13px; color:#737373; letter-spacing:.05em; text-transform:uppercase;">Robotic Lawnz · New lead</p>
  <h1 style="font-size:20px; margin:8px 0 12px;">{lead.email}</h1>
  <table style="border-collapse:collapse; width:100%; font-size:14px;">
    <tr><td style="padding:6px 0; color:#737373;">Phone</td><td>{lead.phone or '—'}</td></tr>
    <tr><td style="padding:6px 0; color:#737373;">Preferred</td><td>{lead.preferred_contact}</td></tr>
    <tr><td style="padding:6px 0; color:#737373;">Yard</td><td>{summary}</td></tr>
    <tr><td style="padding:6px 0; color:#737373;">Notes</td><td>{(lead.notes or '—')}</td></tr>
  </table>
  <p style="margin:24px 0;">
    <a href="{sales_url}" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 18px; border-radius:9999px; text-decoration:none; font-weight:600;">Open in CRM</a>
  </p>
</body></html>"""
    return EmailMessage(
        to=[settings.sales_inbox_email],
        subject=subject,
        html=html,
        text=text,
        reply_to=lead.email,
    )


# ---------------------------------------------------------------------------
# BackgroundTasks-friendly entry point
# ---------------------------------------------------------------------------


async def send_lead_emails(lead: Any, assessment: Any) -> None:
    """Send both homeowner confirmation + sales notification.

    Designed for `BackgroundTasks.add_task` — never raises into the request
    handler. All errors are logged and swallowed.
    """
    client = ResendClient.from_settings()
    if client is None:
        logger.info("email.skip", reason="RESEND_API_KEY not configured", lead_id=str(lead.id))
        return

    messages = [
        homeowner_confirmation(email=lead.email, assessment=assessment),
        sales_notification(lead=lead, assessment=assessment),
    ]
    for msg in messages:
        try:
            email_id = await client.send(msg)
            logger.info("email.sent", subject=msg.subject, to=msg.to, email_id=email_id)
        except EmailError as e:
            logger.warning("email.failed", subject=msg.subject, to=msg.to, error=str(e))
        except Exception as e:
            logger.exception("email.unexpected", subject=msg.subject, error=str(e))


__all__ = [
    "EmailError",
    "EmailMessage",
    "ResendClient",
    "homeowner_confirmation",
    "sales_notification",
    "send_lead_emails",
]
