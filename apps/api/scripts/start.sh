#!/usr/bin/env bash
# Railway start command for the API service.
#
# 1. Apply pending Alembic migrations (idempotent — safe on every boot).
# 2. Hand off to uvicorn on the platform-provided $PORT.
#
# A separate seed step is intentionally NOT run here — `python scripts/seed_mowers.py`
# is a one-off, executed manually from `railway run` after the first deploy
# (see infra/railway/README.md). Re-running on every boot would slow startup
# and clobber any catalog edits made via the admin UI.

set -euo pipefail

# Railway sets $PORT; locally we default to 8000.
PORT="${PORT:-8000}"
WORKERS="${UVICORN_WORKERS:-2}"

echo "[start] alembic upgrade head"
alembic upgrade head

echo "[start] uvicorn on :${PORT} with ${WORKERS} workers"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --workers "${WORKERS}" \
  --proxy-headers \
  --forwarded-allow-ips='*' \
  --timeout-keep-alive 30 \
  --access-log
