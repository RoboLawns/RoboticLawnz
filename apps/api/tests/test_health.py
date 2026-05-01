"""Smoke test for the health router. Doesn't require a live DB for /healthz."""

from __future__ import annotations

from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_liveness_ok() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


async def test_root_returns_metadata() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
    assert res.status_code == 200
    assert res.json()["name"] == "roboticlawnz-api"
