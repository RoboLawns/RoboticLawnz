# syntax=docker/dockerfile:1.7
#
# Production image for the ZippyLawnz API.
#
# Multi-stage so the final image doesn't carry build toolchains. Listens on
# $PORT (Railway-provided) via scripts/start.sh, which also runs Alembic on boot.

# ───────── builder ─────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (layer cache friendly), then the project.
COPY pyproject.toml README.md ./
RUN pip install --upgrade pip wheel && pip install --prefix=/install "."
COPY . .
RUN pip install --prefix=/install --no-deps "."

# ───────── runtime ─────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.12/site-packages"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libgeos-c1v5 \
        curl \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

COPY --from=builder /install /install
COPY --chown=app:app . .

# Make the entrypoint script executable. Permissions don't always survive the
# COPY (host filesystem may not preserve +x), so chmod here too.
RUN chmod +x /app/scripts/start.sh

USER app

EXPOSE 8000

# Railway runs its own platform health checks against $PORT/healthz, but the
# in-image probe helps with `docker run` and other runtimes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/healthz" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/scripts/start.sh"]
