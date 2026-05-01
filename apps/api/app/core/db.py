"""Async SQLAlchemy engine + session factory.

The default `DATABASE_URL` uses the `postgresql+psycopg` driver which supports
both sync and async modes. Migrations (Alembic) use the sync engine; the API
uses the async engine.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import URL, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy models."""


def _to_async_url(url: str) -> str:
    # Normalise sync URLs to the async psycopg driver.
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _to_sync_url(url: str) -> str:
    if "+psycopg" in url:
        return url
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


_async_engine: AsyncEngine = create_async_engine(
    _to_async_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.is_dev and False,  # flip to True for SQL trace
)

_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    _async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


def get_async_engine() -> AsyncEngine:
    return _async_engine


def get_sync_engine() -> Engine:
    """Used by Alembic and one-off scripts."""
    sync_url = settings.sync_database_url or _to_sync_url(settings.database_url)
    return create_engine(sync_url, pool_pre_ping=True)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding an `AsyncSession`."""
    async with _session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        else:
            await session.commit()


__all__ = [
    "Base",
    "URL",
    "get_async_engine",
    "get_sync_engine",
    "get_db",
]
