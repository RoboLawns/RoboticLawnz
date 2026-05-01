"""Pytest configuration shared across the test suite."""

from __future__ import annotations

import asyncio
import os
from collections.abc import Iterator

import pytest

# Ensure tests never connect to a real DB / external service unless explicitly
# opted in. Individual tests can override via monkeypatch / fixtures.
os.environ.setdefault("APP_ENV", "dev")
os.environ.setdefault("SESSION_COOKIE_SECRET", "test-secret-please-replace")


@pytest.fixture(scope="session")
def event_loop() -> Iterator[asyncio.AbstractEventLoop]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
