"""Authentication, RBAC authorization, RLS context, and CSRF dependencies."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AccountLockedError, AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.auth import User
from app.repositories.user_repo import UserRepository

__all__ = [
    "get_current_user",
    "get_db",
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
            text("SET LOCAL app.user_id = :uid;"),
            {"uid": uid_val},
        )
        await session.execute(
            text("SET LOCAL app.role = :role;"),
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

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id_with_role(user_id)

    if user is None:
        raise AuthenticationError("Authenticated user account could not be found.")

    if user.is_deleted or not user.is_active:
        raise AuthenticationError("User account has been deactivated or removed.")

    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise AccountLockedError(
            f"Account is temporarily locked until {user.locked_until.isoformat()} "
            "due to repeated failed authentication attempts."
        )

    # Set PostgreSQL RLS context to active user
    await set_rls_context(session, user.id, user.role.name)
    return user


def require_role(*allowed_roles: str) -> Callable[..., User]:
    """Factory creating an endpoint dependency enforcing role-based access control."""

    def role_dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role.name not in allowed_roles:
            raise AuthorizationError(
                f"Role '{user.role.name}' is not authorized to access this resource. "
                f"Required role: {', '.join(allowed_roles)}."
            )
        return user

    return role_dependency


def verify_csrf(request: Request) -> None:
    """Validate double-submit CSRF token when authentication relies on session cookies."""
    # Bearer authorization headers are not vulnerable to browser CSRF
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return

    # Check state-changing HTTP methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        cookie_csrf = request.cookies.get("csrf_token")
        header_csrf = request.headers.get("X-CSRF-Token")
        if not cookie_csrf or not header_csrf or cookie_csrf != header_csrf:
            raise AuthorizationError("CSRF verification failed: missing or invalid token.")
