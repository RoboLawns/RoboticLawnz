"""Rate-limiting middleware (Section 9.3).

Wraps `slowapi`. Per-session keys when we have a signed cookie, falling back
to the client IP otherwise. Storage is Redis when configured (so multi-worker
deploys share state), in-memory in dev.

Per-route limits are applied via the `@limiter.limit("5/minute")` decorator.
Common policies are exposed as constants below so they're easy to audit.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse

from app.core.config import settings


def _key_func(request: StarletteRequest) -> str:
    """Prefer the signed session cookie; fall back to IP. Always returns a
    non-empty string so the limiter never errors on missing keys."""
    cookie = request.cookies.get(settings.session_cookie_name)
    if cookie:
        # Hash-prefix to keep keys short + opaque in Redis.
        return f"sess:{hash(cookie) & 0xFFFFFFFFFFFFFFFF:016x}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_key_func,
    storage_uri=settings.redis_url,
    headers_enabled=True,
    strategy="fixed-window",
    default_limits=["120/minute"],  # global default — most reads
)


# ---------------------------------------------------------------------------
# Per-route policy constants — keep here so reviewers can audit at a glance.
# ---------------------------------------------------------------------------

CREATE_ASSESSMENT_LIMIT = "10/minute"
COMPLETE_ASSESSMENT_LIMIT = "5/minute"
CAPTURE_LEAD_LIMIT = "5/minute"
ML_INFERENCE_LIMIT = "3/minute"      # SAM 2 + grass classifier
SLOPE_SAMPLE_LIMIT = "60/minute"     # mobile users tap several times in a row
ADMIN_WRITE_LIMIT = "60/minute"


async def rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    """JSON 429 response. We avoid `from None` so the underlying detail surfaces
    in dev tracebacks but stays out of the body."""
    if not isinstance(exc, RateLimitExceeded):
        # Defensive — slowapi only raises this type via this handler.
        raise exc
    detail = str(exc.detail) if exc.detail else "rate limit exceeded"
    return JSONResponse(
        status_code=429,
        content={"detail": detail, "limit": detail},
        headers={"Retry-After": "60"},
    )


__all__ = [
    "ADMIN_WRITE_LIMIT",
    "CAPTURE_LEAD_LIMIT",
    "COMPLETE_ASSESSMENT_LIMIT",
    "CREATE_ASSESSMENT_LIMIT",
    "limiter",
    "ML_INFERENCE_LIMIT",
    "rate_limit_handler",
    "SLOPE_SAMPLE_LIMIT",
]
