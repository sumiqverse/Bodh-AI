"""SQLAlchemy 2.0 async database engine and session factory."""

import socket
import ssl
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _resolve_neon_ipv4(url_str: str, connect_args: dict[str, object]) -> str:
    """Resolve Neon host to IPv4 to eliminate IPv6 network route drop timeouts on Windows."""
    if "neon.tech" in url_str:
        try:
            parsed = urlparse(url_str)
            hostname = parsed.hostname
            if hostname:
                endpoint_id = hostname.split(".")[0]
                port = parsed.port or 5432
                ipv4 = socket.getaddrinfo(hostname, port, socket.AF_INET)[0][4][0]
                userinfo = f"{parsed.username}:{parsed.password}@" if parsed.username else ""
                netloc = f"{userinfo}{ipv4}:{port}"
                new_url = parsed._replace(netloc=netloc).geturl()

                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

                connect_args["statement_cache_size"] = 0
                connect_args["ssl"] = ssl_ctx
                connect_args["server_settings"] = {"options": f"endpoint={endpoint_id}"}
                return new_url
        except Exception as exc:
            logger.warning(
                "Could not resolve Neon host to IPv4, using original URL", error=str(exc)
            )
    return url_str


def get_engine() -> AsyncEngine:
    """Retrieve or initialize the singleton async SQLAlchemy engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        connect_args: dict[str, object] = {}
        # Disable prepared statement cache when using Neon PgBouncer transaction pooler
        if "-pooler" in settings.database_url:
            connect_args["statement_cache_size"] = 0

        target_url = _resolve_neon_ipv4(settings.database_url, connect_args)

        # Enable connection pooling and pool pre-ping to recycle dead connections
        _engine = create_async_engine(
            target_url,
            echo=settings.debug,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args=connect_args,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve or initialize the async session maker."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an isolated async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_health(session: AsyncSession) -> bool:
    """Execute a lightweight probe query to verify database connectivity."""
    try:
        result = await session.execute(text("SELECT 1"))
        return result.scalar() == 1
    except Exception as exc:
        logger.error("Database health check probe failed", error=str(exc))
        return False
