#!/usr/bin/env bash
#
# Single-container start script for Railway.
#
# 1. Apply Alembic migrations (idempotent).
# 2. Start FastAPI on port 8000 in the background.
# 3. Start Next.js on $PORT (default 3000) in the foreground.
#    Railway routes external traffic to $PORT.
#
# The Next.js server proxies /api/v1/* requests to the internal FastAPI
# server via next.config.ts rewrites.
#
set -euo pipefail

WEB_PORT="${PORT:-3000}"

echo "[docker-start] Running Alembic migrations"
cd /app/apps/api
alembic upgrade head

echo "[docker-start] Starting FastAPI on :8000"
cd /app/apps/api
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips='*' &

echo "[docker-start] Starting Next.js web server on :${WEB_PORT}"
cd /app
exec node apps/web/server.js
