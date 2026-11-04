"""Main FastAPI application entrypoint with security, logging, and RFC 7807 error handling."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import verify_csrf
from app.api.routes.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import (
    CSRFOriginValidationMiddleware,
    PayloadSizeLimitMiddleware,
    RedisRateLimiter,
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.telemetry import configure_telemetry
from app.db.migrate import run_startup_migrations
from app.db.redis import close_redis, get_redis_client
from app.db.session import get_engine

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle for database and Redis pools."""
    settings = get_settings()
    configure_logging(settings.debug)
    configure_telemetry()
    logger.info("Starting BodhAI API service", env=settings.app_env)

    # Ensure schema migrations are up-to-date
    await run_startup_migrations()

    # Initialize Redis connection in application state
    try:
        app.state.redis = get_redis_client()
    except Exception as exc:
        logger.warning("Redis initialization delayed", error=str(exc))
        app.state.redis = None

    yield

    # Clean up resources on shutdown
    logger.info("Shutting down BodhAI API service")
    await close_redis()
    engine = get_engine()
    await engine.dispose()


def create_app() -> FastAPI:
    """Instantiate and configure the FastAPI application."""
    settings = get_settings()

    rate_limiter = RedisRateLimiter()

    application = FastAPI(
        title=settings.app_name,
        description="Adaptive learning platform backend for Classes 6-10 in India",
        version="0.1.0",
        lifespan=lifespan,
        dependencies=[Depends(rate_limiter.check_rate_limit), Depends(verify_csrf)],
    )

    # 1. Request ID propagation and structured logging context
    application.add_middleware(RequestIdMiddleware)

    # 2. OWASP security response headers
    application.add_middleware(SecurityHeadersMiddleware)

    # 3. Payload size limiting (anti-DoS / OOM protection)
    application.add_middleware(PayloadSizeLimitMiddleware)

    # 4. CSRF origin check on state-changing methods
    application.add_middleware(CSRFOriginValidationMiddleware)

    # 5. Strict CORS allow-list
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 4. Standard RFC 7807 application/problem+json error handlers
    register_error_handlers(application)

    # 5. Include system and domain routers
    application.include_router(health_router)
    application.include_router(api_v1_router)
    from app.api.v1.adaptive import router as adaptive_direct_router

    application.include_router(adaptive_direct_router, prefix="/v1")

    return application


app = create_app()
