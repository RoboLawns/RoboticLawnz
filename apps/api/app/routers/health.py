"""Liveness + readiness endpoints used by Railway and uptime monitors."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.db import get_db

router = APIRouter(tags=["health"])


@router.get("/healthz", status_code=status.HTTP_200_OK)
async def liveness() -> dict[str, str]:
    """Liveness: process is up."""
    return {"status": "ok", "version": __version__}


@router.get("/readyz", status_code=status.HTTP_200_OK)
async def readiness(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Readiness: DB reachable. Add Redis / R2 checks as they come online."""
    await db.execute(text("SELECT 1"))
    return {"status": "ready", "version": __version__, "db": "ok"}
