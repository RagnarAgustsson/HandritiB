"""SQLAlchemy async engine and session factory for Neon PostgreSQL.

Uses asyncpg driver with NullPool to avoid double-pooling with Neon's PgBouncer.
DATABASE_URL is shared with the Vercel frontend (same Neon database).

Drizzle owns all migrations — SQLAlchemy is read-only here.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings


def _build_database_url(raw_url: str) -> str:
    """Convert postgres:// or postgresql:// to postgresql+asyncpg:// for asyncpg driver."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Already in the correct format or empty
    return raw_url


# Build engine lazily — if DATABASE_URL is empty we still import cleanly
_engine = None
_async_session_factory = None


def _get_engine():
    global _engine
    if _engine is None and settings.DATABASE_URL:
        url = _build_database_url(settings.DATABASE_URL)
        _engine = create_async_engine(
            url,
            pool_pre_ping=True,
            poolclass=NullPool,  # Avoid double-pooling with Neon's PgBouncer
        )
    return _engine


def _get_session_factory():
    global _async_session_factory
    if _async_session_factory is None:
        engine = _get_engine()
        if engine is not None:
            _async_session_factory = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async SQLAlchemy session.

    Usage:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    factory = _get_session_factory()
    if factory is None:
        raise RuntimeError("DATABASE_URL is not configured — cannot create DB session")

    async with factory() as session:
        yield session


async def dispose_engine() -> None:
    """Dispose the engine connection pool — call on app shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
