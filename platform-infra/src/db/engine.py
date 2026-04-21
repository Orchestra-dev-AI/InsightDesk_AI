# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Async Database Engine
# Creates the async SQLAlchemy engine and session factory.
# Supports PostgreSQL (production) and SQLite (local dev).
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import settings

logger = logging.getLogger("insightdesk.infra.db")

# ── Engine & Session Factory ────────────────────────────────────────────────

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """
    Initialize the async engine and create all tables.
    Called once during application startup.
    """
    global _engine, _session_factory

    logger.info("Initializing database engine: %s", settings.DATABASE_URL[:40] + "…")

    _engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DB_ECHO,
        pool_pre_ping=True,
    )
    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create tables (safe for dev; in production use Alembic migrations)
    from src.db.models import Base

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables created / verified.")


async def dispose_db() -> None:
    """Gracefully shut down the engine connection pool."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("Database engine disposed.")
        _engine = None


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency-injection helper for FastAPI routes.

    Usage::

        @app.get("/example")
        async def example(session: AsyncSession = Depends(get_async_session)):
            ...
    """
    if _session_factory is None:
        raise RuntimeError("Database not initialized — call init_db() first.")

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
