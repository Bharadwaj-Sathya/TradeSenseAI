from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config.configuration import settings
from app.utils.Base import Base

# Import models so Alembic can discover them.
from app.features.models.candle import Candle


# ---------------------------------------------------------
# Alembic Config
# ---------------------------------------------------------

config = context.config


# ---------------------------------------------------------
# Database URL
# ---------------------------------------------------------

config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace(
        "%",
        "%%",
    ),
)


# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ---------------------------------------------------------
# SQLAlchemy Metadata
# ---------------------------------------------------------

target_metadata = Base.metadata


# ---------------------------------------------------------
# Offline Migration
# ---------------------------------------------------------

def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    No database connection is required.
    """

    url = config.get_main_option(
        "sqlalchemy.url"
    )

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------
# Synchronous Migration Function
# ---------------------------------------------------------

def do_run_migrations(
    connection: Connection,
) -> None:
    """
    Configure Alembic using a synchronous
    connection supplied by SQLAlchemy's async engine.
    """

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------
# Online Migration
# ---------------------------------------------------------

async def run_async_migrations() -> None:
    """
    Run migrations using SQLAlchemy's async engine.

    Required because our DATABASE_URL uses:

        postgresql+asyncpg://
    """

    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    configuration["sqlalchemy.url"] = (
        settings.database_url
    )

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:

        await connection.run_sync(
            do_run_migrations
        )

    await connectable.dispose()


# ---------------------------------------------------------
# Online Entry Point
# ---------------------------------------------------------

def run_migrations_online() -> None:
    """
    Run migrations against the live database.
    """

    import asyncio

    asyncio.run(
        run_async_migrations()
    )


# ---------------------------------------------------------
# Migration Entry Point
# ---------------------------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()