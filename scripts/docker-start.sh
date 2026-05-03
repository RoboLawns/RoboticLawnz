#!/bin/sh
#
# Single-container start script for Railway.
#
# 1. Apply Alembic migrations (non-fatal — web still serves without DB).
# 2. Start FastAPI on port 8000 in the background.
# 3. Start Next.js on Railway's $PORT in the foreground.
#
# The Next.js server proxies /api/v1/* requests to the internal FastAPI
# server via next.config.ts rewrites.
#
# Railway injects $PORT at runtime — we must NOT override it.  The
# healthcheck probes this same port.
#
# Uses POSIX-compatible /bin/sh (dash on Debian) syntax — no bashisms.
#
set -e

echo "[start] Running Alembic migrations..."

cd /app/apps/api
if alembic upgrade head; then
  echo "[start] Alembic complete"
else
  echo "[start] Alembic skipped (database not available?)"
fi

echo "[start] Starting FastAPI on :8000..."
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips='*' \
  --log-level warning &

echo "[start] Starting Next.js..."
cd /app
exec node apps/web/server.js
