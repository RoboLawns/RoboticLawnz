"""Authentication + session helpers.

Anonymous users are tracked via a signed cookie (`rl_session`) — see
`SessionSigner`. Authenticated users present a Clerk JWT in the `Authorization`
header; verification is done against Clerk's JWKS endpoint.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import httpx
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from itsdangerous import BadSignature, URLSafeTimedSerializer
from jose import JWTError, jwt

from app.core.config import settings


@dataclass(slots=True, frozen=True)
class SessionContext:
    """Resolved request session — either anonymous or Clerk-authenticated."""

    session_id: str
    user_id: str | None = None
    role: str = "homeowner"

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None


class SessionSigner:
    """Wraps `itsdangerous` for signing the anonymous session cookie."""

    _SALT = "rl-session-v1"

    def __init__(self, secret: str) -> None:
        self._serializer = URLSafeTimedSerializer(secret, salt=self._SALT)

    def sign(self, session_id: str) -> str:
        return self._serializer.dumps(session_id)

    def unsign(self, token: str, max_age_seconds: int) -> str | None:
        try:
            return self._serializer.loads(token, max_age=max_age_seconds)
        except BadSignature:
            return None


_signer = SessionSigner(settings.session_cookie_secret.get_secret_value())


def new_session_id() -> str:
    """Cryptographically random session id (URL-safe)."""
    return secrets.token_urlsafe(24)


def set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=_signer.sign(session_id),
        max_age=settings.session_cookie_max_age_days * 86400,
        httponly=True,
        samesite="lax",
        secure=settings.is_prod,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")


# ---------------------------------------------------------------------------
# Clerk JWKS helpers
# ---------------------------------------------------------------------------

_CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"


@lru_cache(maxsize=1)
def _get_jwks() -> dict[str, Any]:
    """Fetch Clerk's JWKS (cached for the process lifetime).

    The cache is intentionally process-scoped; restart the server to pick up
    rotated keys (Clerk rotates infrequently and announces rotation in advance).
    """
    headers: dict[str, str] = {}
    if settings.clerk_secret_key:
        headers["Authorization"] = "Bearer " + settings.clerk_secret_key.get_secret_value()

    # Use the configurable URL if provided (useful for testing with a mock JWKS).
    url = settings.clerk_jwks_url or _CLERK_JWKS_URL
    resp = httpx.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()  # type: ignore[no-any-return]


def _decode_clerk_jwt(token: str) -> str | None:
    """Verify a Clerk JWT and return the sub (Clerk user ID) on success.

    Returns None if the token is invalid or verification is not configured.
    """
    if not settings.clerk_secret_key:
        # Clerk not configured — skip verification (dev / CI without secrets).
        return None
    try:
        jwks = _get_jwks()
        payload: dict[str, Any] = jwt.decode(token, jwks, algorithms=["RS256"])
        clerk_sub: str = payload["sub"]
        return clerk_sub
    except (JWTError, KeyError, httpx.HTTPError):
        return None


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


async def resolve_session(
    request: Request,
    response: Response,
    cookie: Annotated[str | None, Cookie(alias="rl_session")] = None,
) -> SessionContext:
    """Always returns a SessionContext.

    Priority:
    1. If the request carries a valid Clerk Bearer JWT, return an authenticated
       session using the Clerk sub as the user_id.
    2. Otherwise fall back to the signed anonymous session cookie (minting a new
       one if absent or expired).
    """
    # -- 1. Try Clerk Bearer token -------------------------------------------
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        raw_token = auth_header[7:]
        clerk_sub = _decode_clerk_jwt(raw_token)
        if clerk_sub:
            # Reuse the cookie session_id if present so the anonymous work
            # done before sign-in stays linkable.
            max_age = settings.session_cookie_max_age_days * 86400
            anon_id = _signer.unsign(cookie, max_age_seconds=max_age) if cookie else None
            session_id = anon_id or new_session_id()
            return SessionContext(session_id=session_id, user_id=clerk_sub)

    # -- 2. Anonymous cookie session -----------------------------------------
    max_age = settings.session_cookie_max_age_days * 86400
    session_id = _signer.unsign(cookie, max_age_seconds=max_age) if cookie else None

    if not session_id:
        session_id = new_session_id()
        set_session_cookie(response, session_id)

    return SessionContext(session_id=session_id)


SessionDep = Annotated[SessionContext, Depends(resolve_session)]


async def require_user(session: SessionDep) -> SessionContext:
    if not session.is_authenticated:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth required")
    return session


async def require_role(role: str, session: SessionDep) -> SessionContext:
    if session.role != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return session


__all__ = [
    "SessionContext",
    "SessionDep",
    "clear_session_cookie",
    "new_session_id",
    "require_role",
    "require_user",
    "resolve_session",
    "set_session_cookie",
]
