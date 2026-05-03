#!/usr/bin/env bash
#
# Single-container start script for Railway.
#
# 1. Apply Alembic migrations (non-fatal — app still serves web pages without DB).
# 2. Start FastAPI on port 8000 in the background.
# 3. Start Next.js on $PORT (default 3000) in the foreground.
#    Railway routes external traffic to $PORT.
#
# The Next.js server proxies /api/v1/* requests to the internal FastAPI
# server via next.config.ts rewrites.
#
set -euo pipefail

echo "[docker-start] Running Alembic migrations"

# Migrations are non-fatal — if the database isn't provisioned yet, the web
# app still serves landing pages and static content.  API calls will return
# 503 until the database is available.
if alembic upgrade head 2>&1; then
  echo "[docker-start] Alembic migrations complete"
else
  echo "[docker-start] WARNING: Alembic failed — API will be degraded until database is available"
  echo "[docker-start] Check that DATABASE_URL is set and the Postgres service is linked"
fi

echo "[docker-start] Starting FastAPI on :8000"
cd /app/apps/api
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips='*' \
  --log-level info &

echo "[docker-start] Starting Next.js web server on :3000"
cd /app
export PORT=3000
export HOSTNAME=0.0.0.0
exec node apps/web/server.js
