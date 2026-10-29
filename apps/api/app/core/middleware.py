"""Security headers, request ID propagation, and Redis-backed rate limiting middleware."""

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import get_settings
from app.core.errors import RateLimitExceededError
from app.core.telemetry import metrics

logger = structlog.get_logger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Propagates or assigns a unique request ID and attaches it to logging context."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        req_id = request.headers.get("X-Request-ID")
        if not req_id:
            req_id = str(uuid.uuid4())

        request.state.request_id = req_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=req_id)

        start_time = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start_time

        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-MS"] = f"{duration * 1000.0:.2f}"

        metrics.record_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_sec=duration,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces essential HTTP security headers across all responses."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)

        # Baseline OWASP recommended security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(), microphone=(), payment=()"
        )
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        return response


class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    """Enforces request body size limits to prevent Denial of Service and OOM."""

    DEFAULT_MAX_BYTES = 2 * 1024 * 1024  # 2MB
    IMPORT_MAX_BYTES = 10 * 1024 * 1024  # 10MB for curriculum packs

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        max_bytes = (
            self.IMPORT_MAX_BYTES
            if request.url.path.endswith("/import")
            else self.DEFAULT_MAX_BYTES
        )

        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > max_bytes:
                    logger.warning(
                        "Request payload size exceeded maximum limit",
                        path=request.url.path,
                        content_length=length,
                        max_allowed=max_bytes,
                    )
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=413,
                        content={
                            "type": "https://errors.bodhai.edu.in/payload-too-large",
                            "title": "Payload Too Large",
                            "status": 413,
                            "detail": (
                                f"Request body exceeds maximum allowed limit of {max_bytes} bytes."
                            ),
                            "instance": request.url.path,
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)


class CSRFOriginValidationMiddleware(BaseHTTPMiddleware):
    """Enforces Origin validation on state-changing requests to protect against CSRF."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self.settings = get_settings()

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("origin")
            if origin:
                allowed_origins = self.settings.cors_origins_list
                # Reject if origin is present but not in allowed origins
                if origin not in allowed_origins and "*" not in allowed_origins:
                    logger.warning(
                        "CSRF cross-origin validation failed",
                        origin=origin,
                        path=request.url.path,
                    )
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=403,
                        content={
                            "type": "https://errors.bodhai.edu.in/forbidden",
                            "title": "Forbidden",
                            "status": 403,
                            "detail": "Cross-Origin request blocked by CSRF policy.",
                            "instance": request.url.path,
                        },
                    )

        return await call_next(request)


class RedisRateLimiter:
    """Sliding-window Redis-backed rate limiting service."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def check_rate_limit(self, request: Request) -> None:
        """Verify the client has not exceeded their allocated request quota."""
        # Allow internal health & ready probes without rate limiting
        if request.url.path in ("/health", "/ready"):
            return

        # Identify client by IP
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "unknown")
        )

        # Window identifier per minute
        current_minute = int(time.time() // 60)
        cache_key = f"ratelimit:{client_ip}:{current_minute}"

        # Fetch redis client from app state if available
        redis_client = getattr(request.app.state, "redis", None)
        if redis_client is None:
            # If Redis is unavailable or not yet configured (e.g. test suite), permit request
            return

        try:
            current_count = await redis_client.incr(cache_key)
            if current_count == 1:
                await redis_client.expire(cache_key, 65)

            if current_count > self.settings.rate_limit_per_minute:
                logger.warning(
                    "Rate limit exceeded",
                    client_ip=client_ip,
                    count=current_count,
                    limit=self.settings.rate_limit_per_minute,
                )
                msg = (
                    f"Rate limit exceeded: maximum {self.settings.rate_limit_per_minute} "
                    "requests per minute."
                )
                raise RateLimitExceededError(detail=msg)
        except RateLimitExceededError:
            raise
        except Exception as exc:
            # Gracefully degrade on Redis network failure rather than blocking traffic
            logger.warning("Rate limiting Redis lookup failed; allowing request", error=str(exc))
