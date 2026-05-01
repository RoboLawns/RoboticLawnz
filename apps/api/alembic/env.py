"""Alembic env — uses the sync engine and the app's SQLAlchemy metadata."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool

from app.core.config import settings
from app.core.db import Base, get_sync_engine

# Import all models so their tables are registered on Base.metadata.
from app import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the URL from .env so devs don't need to keep alembic.ini in sync.
config.set_main_option(
    "sqlalchemy.url",
    settings.sync_database_url or settings.database_url.replace("+asyncpg", "+psycopg"),
)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):  # type: ignore[no-untyped-def]
    """Skip PostGIS spatial reference / TIGER tables that we don't manage."""
    if type_ == "table" and name in {"spatial_ref_sys", "topology", "layer"}:
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = get_sync_engine().execution_options(poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
