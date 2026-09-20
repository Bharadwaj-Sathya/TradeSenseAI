
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config.configuration import settings
from app.core.logging import get_logger

# -------------------------------------------------
# Logging
# -------------------------------------------------
logger = get_logger(__name__)


def _build_engine():
    database_url = (settings.database_url or "").strip()
    if not database_url:
        logger.warning("DATABASE_URL is not configured; database support is disabled")
        return None

    return create_async_engine(
        database_url,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )


# -------------------------------------------------
# Create async engine
# -------------------------------------------------
engine = _build_engine()

# -------------------------------------------------
# Session factory
# -------------------------------------------------
AsyncSessionLocal = (
    async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    if engine is not None
    else None
)


# -------------------------------------------------
# Dependency: DB session
# -------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if AsyncSessionLocal is None:
        raise RuntimeError("Database is not configured. Set DATABASE_URL before using database access.")

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("Database session error")
            raise
        finally:
            await session.close()


def get_session_factory():
    """
    Always creates a fresh engine bound to the current event loop.
    Safe to call from both FastAPI and Celery workers.
    """

    database_url = (settings.database_url or "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    engine = create_async_engine(
        database_url,
        connect_args={"server_settings": {"timezone": "UTC"}},
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory