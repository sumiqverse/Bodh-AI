"""Async Redis client connection and health check utilities."""

import redis.asyncio as aioredis
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

_redis_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    """Retrieve or initialize the global async Redis client."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
    return _redis_client


async def close_redis() -> None:
    """Gracefully disconnect and close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


async def check_redis_health(client: aioredis.Redis | None = None) -> bool:
    """Send a PING command to verify Redis connectivity."""
    target_client = client or _redis_client
    if target_client is None:
        try:
            target_client = get_redis_client()
        except Exception as exc:
            logger.error("Failed to initialize Redis client for health check", error=str(exc))
            return False

    try:
        response = await target_client.ping()
        return bool(response)
    except Exception as exc:
        logger.error("Redis ping probe failed", error=str(exc))
        return False
