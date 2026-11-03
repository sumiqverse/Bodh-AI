"""Authentication, RBAC authorization, RLS context, and CSRF dependencies."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AccountLockedError, AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.auth import Session, User
from app.repositories.user_repo import UserRepository

__all__ = [
    "get_current_user",
    "get_db",
    "get_optional_current_user",
    "get_request_language",
    "require_role",
    "set_rls_context",
    "verify_csrf",
]


async def set_rls_context(
    session: AsyncSession,
    user_id: uuid.UUID | None,
    role: str,
) -> None:
    """Apply PostgreSQL session variables for defense-in-depth Row-Level Security."""
    bind = getattr(session, "bind", None)
    if bind is None and hasattr(session, "get_bind"):
        try:
            bind = session.get_bind()
        except Exception:
            bind = None
    if bind and hasattr(bind, "dialect") and bind.dialect.name == "postgresql":
        uid_val = str(user_id) if user_id is not None else ""
        await session.execute(
            text("SELECT set_config('app.user_id', :uid, true);"),
            {"uid": uid_val},
        )
        await session.execute(
            text("SELECT set_config('app.role', :role, true);"),
            {"role": role},
        )


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Resolve, authenticate, and validate the current user from Bearer header or cookie."""
    token: str | None = None

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        # Set anonymous RLS context before failing
        await set_rls_context(session, None, "anonymous")
        raise AuthenticationError("Authentication credentials were not provided.")

    user_repo = UserRepository(session)

    payload = decode_token(token)
    token_type = payload.get("type")
    if token_type != "access":
        raise AuthenticationError("Invalid token type. An access token is required.")

    sub = payload.get("sub")
    if not sub:
        raise AuthenticationError("Token subject is missing or malformed.")

    try:
        user_id = uuid.UUID(sub)
    except ValueError as err:
        raise AuthenticationError("Invalid token subject format.") from err

    user = await user_repo.get_by_id_with_role(user_id)

    if user is None:
        raise AuthenticationError("Authenticated user account could not be found.")

    if user.is_deleted or not user.is_active:
        raise AuthenticationError("User account has been deactivated or removed.")

    session_id = payload.get("sid")
    if not session_id:
        raise AuthenticationError("Session identifier is missing. Please sign in again.")

    try:
        session_uuid = uuid.UUID(str(session_id))
    except ValueError as err:
        raise AuthenticationError("Session identifier is malformed.") from err

    session_record = await session.get(Session, session_uuid)
    if session_record is None or session_record.is_revoked:
        raise AuthenticationError("Session has been revoked. Please sign in again.")

    expires_at = session_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC) or session_record.user_id != user.id:
        raise AuthenticationError("Session has expired. Please sign in again.")

    locked_until = user.locked_until
    if locked_until is not None and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=UTC)
    if locked_until and locked_until > datetime.now(UTC):
        raise AccountLockedError(
            f"Account is temporarily locked until {locked_until.isoformat()} "
            "due to repeated failed authentication attempts."
        )

    # Set PostgreSQL RLS context to active user
    await set_rls_context(session, user.id, user.role.name)
    return user


async def get_optional_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Resolve current user if authentication credentials provided, otherwise None."""
    auth_header = request.headers.get("Authorization")
    has_cookie = "access_token" in request.cookies
    if not auth_header and not has_cookie:
        await set_rls_context(session, None, "anonymous")
        return None
    try:
        return await get_current_user(request, session)
    except Exception:
        await set_rls_context(session, None, "anonymous")
        return None


def require_role(*allowed_roles: Any) -> Callable[..., User]:
    """Factory creating an endpoint dependency enforcing role-based access control."""
    flattened_roles: list[str] = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            flattened_roles.extend(r)
        elif isinstance(r, str):
            flattened_roles.append(r)

    def role_dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role.name not in flattened_roles:
            raise AuthorizationError(
                f"Role '{user.role.name}' is not authorized to access this resource. "
                f"Required role: {', '.join(flattened_roles)}."
            )
        return user

    return role_dependency


def get_request_language(
    request: Request,
    language: str | None = None,
    accept_language: str | None = None,
) -> str:
    """Resolve requested language ('hi' or 'en') from query param or Accept-Language header."""
    if language in ("hi", "en"):
        return language
    header_val = accept_language or request.headers.get("Accept-Language", "")
    if "hi" in header_val.lower():
        return "hi"
    return "en"


def verify_csrf(request: Request) -> None:
    """Validate double-submit CSRF token when authentication relies on session cookies."""
    # Bearer authorization headers are not vulnerable to browser CSRF
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return

    # Public auth endpoints mint a new session and do not authorize via the ambient cookie.
    path = getattr(getattr(request, "url", None), "path", "")
    if isinstance(path, str) and path.endswith(
        (
            "/auth/teacher/signup",
            "/auth/teacher/login",
            "/auth/student/login",
            "/auth/student/join",
            "/auth/supabase",
            "/auth/reset-password",
            "/auth/refresh",
        )
    ):
        return

    # Only cookie-authenticated state-changing requests need double-submit validation.
    if request.cookies.get("access_token") is None:
        return

    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        cookie_csrf = request.cookies.get("csrf_token")
        header_csrf = request.headers.get("X-CSRF-Token")
        if not cookie_csrf or not header_csrf or cookie_csrf != header_csrf:
            raise AuthorizationError("CSRF verification failed: missing or invalid token.")
