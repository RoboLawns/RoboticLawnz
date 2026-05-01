"""FastAPI application factory + entrypoint.

Production: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app import __version__
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter, rate_limit_handler
from app.routers import admin, assessments, health, leads, me, mowers, sales

logger = get_logger(__name__)

API_PREFIX = "/api/v1"


def _configure_sentry() -> None:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.app_env,
            release=f"roboticlawnz-api@{__version__}",
            traces_sample_rate=0.1 if settings.is_prod else 1.0,
            send_default_pii=False,
        )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    _configure_sentry()
    logger.info("api.startup", env=settings.app_env, version=__version__)
    try:
        yield
    finally:
        logger.info("api.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Robotic Lawnz API",
        version=__version__,
        description="Backend for the Robotic Lawnz assessment + recommendation flow.",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )

    # Rate limiting (Section 9.3) — register the limiter, exception handler,
    # and ASGI middleware that pulls the per-route policies off endpoint deps.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Health endpoints sit at the root for platform probes.
    app.include_router(health.router)

    # Versioned API surface.
    app.include_router(assessments.router, prefix=API_PREFIX)
    app.include_router(mowers.router, prefix=API_PREFIX)
    app.include_router(leads.router, prefix=API_PREFIX)
    app.include_router(me.router, prefix=API_PREFIX)
    app.include_router(sales.router, prefix=API_PREFIX)
    app.include_router(admin.router, prefix=API_PREFIX)

    @app.get("/")
    async def root() -> JSONResponse:
        return JSONResponse(
            {
                "name": "roboticlawnz-api",
                "version": __version__,
                "docs": "/docs",
                "openapi": f"{API_PREFIX}/openapi.json",
            }
        )

    return app


app = create_app()
