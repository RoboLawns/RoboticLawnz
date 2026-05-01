"""Replicate API client.

Thin async wrapper over Replicate's HTTP API. We avoid the official `replicate`
Python SDK so we don't pull in its sync requests stack on top of our async
FastAPI runtime, and so we can poll predictions with our own retry policy.

Usage:

    client = ReplicateClient.from_settings()
    output = await client.run("model/version", {"image": "https://..."})

The client is a no-op when `REPLICATE_API_TOKEN` is unset — `run()` raises
`ReplicateNotConfigured`. Routers handle this and surface a clean fallback.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

REPLICATE_API_BASE = "https://api.replicate.com/v1"
DEFAULT_TIMEOUT_SECS = 60.0
POLL_INTERVAL_SECS = 1.5
MAX_POLL_SECS = 60.0


class ReplicateError(RuntimeError):
    """Replicate returned an error response."""


class ReplicateNotConfigured(ReplicateError):
    """REPLICATE_API_TOKEN is unset; the caller should fall back."""


class ReplicateTimeout(ReplicateError):
    """Prediction did not reach a terminal state within the budget."""


@dataclass(slots=True)
class ReplicatePrediction:
    id: str
    status: str
    output: Any
    error: str | None
    metrics: dict[str, Any] | None


class ReplicateClient:
    """Async Replicate HTTP client."""

    def __init__(self, token: str, *, base_url: str = REPLICATE_API_BASE) -> None:
        self._token = token
        self._base_url = base_url.rstrip("/")

    @classmethod
    def from_settings(cls) -> "ReplicateClient":
        if not settings.replicate_api_token:
            raise ReplicateNotConfigured("REPLICATE_API_TOKEN is not configured")
        return cls(settings.replicate_api_token.get_secret_value())

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Token {self._token}",
            "Content-Type": "application/json",
            "User-Agent": "roboticlawnz/0.1",
        }

    async def create_prediction(
        self,
        model_version: str,
        inputs: dict[str, Any],
    ) -> ReplicatePrediction:
        """POST /v1/predictions with `version` + `input`."""
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECS) as http:
            resp = await http.post(
                f"{self._base_url}/predictions",
                headers=self._headers,
                json={"version": model_version, "input": inputs},
            )
        if resp.status_code >= 400:
            raise ReplicateError(
                f"replicate create failed: {resp.status_code} {resp.text[:200]}"
            )
        return _parse(resp.json())

    async def get_prediction(self, prediction_id: str) -> ReplicatePrediction:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECS) as http:
            resp = await http.get(
                f"{self._base_url}/predictions/{prediction_id}",
                headers=self._headers,
            )
        if resp.status_code >= 400:
            raise ReplicateError(
                f"replicate get failed: {resp.status_code} {resp.text[:200]}"
            )
        return _parse(resp.json())

    async def run(
        self,
        model_version: str,
        inputs: dict[str, Any],
        *,
        max_wait_secs: float = MAX_POLL_SECS,
    ) -> Any:
        """Create a prediction and poll until terminal. Returns `output` on succeed."""
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
            retry=retry_if_exception_type(httpx.HTTPError),
            reraise=True,
        ):
            with attempt:
                pred = await self.create_prediction(model_version, inputs)

        deadline_at = asyncio.get_running_loop().time() + max_wait_secs
        terminal = {"succeeded", "failed", "canceled"}
        while pred.status not in terminal:
            if asyncio.get_running_loop().time() > deadline_at:
                raise ReplicateTimeout(
                    f"prediction {pred.id} did not finish within {max_wait_secs}s"
                )
            await asyncio.sleep(POLL_INTERVAL_SECS)
            pred = await self.get_prediction(pred.id)

        if pred.status != "succeeded":
            raise ReplicateError(f"prediction {pred.id} {pred.status}: {pred.error}")
        return pred.output


def _parse(body: dict[str, Any]) -> ReplicatePrediction:
    return ReplicatePrediction(
        id=str(body["id"]),
        status=str(body["status"]),
        output=body.get("output"),
        error=body.get("error"),
        metrics=body.get("metrics"),
    )


__all__ = [
    "ReplicateClient",
    "ReplicateError",
    "ReplicateNotConfigured",
    "ReplicatePrediction",
    "ReplicateTimeout",
]
