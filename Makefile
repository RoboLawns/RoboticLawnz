.PHONY: help install dev infra-up infra-down api-dev web-dev test lint typecheck migrate seed clean

SHELL := /bin/bash

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install JS + Python deps.
	pnpm install
	cd apps/api && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"

infra-up: ## Boot Postgres + Redis via docker-compose.
	docker compose -f infra/docker-compose.yml up -d

infra-down: ## Stop Postgres + Redis (keeps data).
	docker compose -f infra/docker-compose.yml down

infra-wipe: ## Stop and DELETE local DB volume.
	docker compose -f infra/docker-compose.yml down -v

api-dev: ## Run the FastAPI dev server.
	cd apps/api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

web-dev: ## Run the Next.js dev server.
	pnpm --filter @zippylawnz/web dev

dev: ## Run everything (assumes infra is up).
	pnpm dev

migrate: ## Apply pending Alembic migrations.
	cd apps/api && . .venv/bin/activate && alembic upgrade head

migration: ## Create a new auto-generated migration ($$message="message").
	cd apps/api && . .venv/bin/activate && alembic revision --autogenerate -m "$(message)"

seed: ## Seed mower catalog.
	cd apps/api && . .venv/bin/activate && python scripts/seed_mowers.py

test: ## Run all tests.
	cd apps/api && . .venv/bin/activate && pytest --cov=app
	pnpm test

lint: ## Lint everything.
	cd apps/api && . .venv/bin/activate && ruff check . && ruff format --check .
	pnpm lint

typecheck: ## Type-check everything.
	cd apps/api && . .venv/bin/activate && mypy .
	pnpm typecheck

clean: ## Remove build artefacts.
	pnpm clean
	cd apps/api && rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage
