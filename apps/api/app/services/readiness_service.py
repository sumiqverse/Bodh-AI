"""Readiness check service evaluating system dependencies."""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import check_redis_health
from app.db.session import check_db_health
from app.schemas.health import ReadyResponse


class ReadinessService:
    """Service to evaluate readiness of database and cache dependencies."""

    @staticmethod
    async def evaluate_readiness(session: AsyncSession) -> ReadyResponse:
        """Probe PostgreSQL and Redis connections concurrently."""
        db_ok = await check_db_health(session)
        redis_ok = await check_redis_health()

        is_ready = db_ok and redis_ok
        return ReadyResponse(
            status="ready" if is_ready else "degraded",
            database=db_ok,
            redis=redis_ok,
            timestamp=datetime.now(UTC),
        )
