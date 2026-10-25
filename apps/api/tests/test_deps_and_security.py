"""Unit tests for security utilities, CSRF validation, token decoding, and logging configuration."""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import MagicMock

import jwt
import pytest
from starlette.requests import Request

from app.api.deps import verify_csrf
from app.core.config import get_settings
from app.core.errors import AuthenticationError, AuthorizationError
from app.core.logging import add_app_context, configure_logging, get_logger
from app.core.security import (
    decode_token,
    generate_csrf_token,
    verify_supabase_token,
)


def test_logging_configuration() -> None:
    """Test configure_logging sets up structlog for debug and non-debug modes."""
    configure_logging(debug=True)
    logger = get_logger("test_debug")
    assert logger is not None

    configure_logging(debug=False)
    logger2 = get_logger("test_prod")
    assert logger2 is not None

    event_dict = add_app_context(None, "info", {"msg": "hello"})
    assert event_dict["app"] == "bodhai-api"


def test_token_expiration_and_invalid_decoding() -> None:
    """Test decode_token error branches for expired and invalid signatures."""
    settings = get_settings()

    # Expired token
    expired_payload = {
        "sub": "test-user-id",
        "type": "access",
        "exp": int(time.time()) - 100,
    }
    expired_token = jwt.encode(
        expired_payload, settings.secret_key, algorithm=settings.jwt_algorithm
    )
    with pytest.raises(AuthenticationError, match="Token has expired"):
        decode_token(expired_token)

    # Invalid token string
    with pytest.raises(AuthenticationError, match="Invalid authentication token"):
        decode_token("not-a-valid-jwt-token-string")


def test_supabase_token_verification() -> None:
    """Test verify_supabase_token validates HS256 tokens and rejects bad signatures."""
    settings = get_settings()
    secret = settings.supabase_jwt_secret or settings.secret_key

    valid_token = jwt.encode({"sub": "supabase-user-123"}, secret, algorithm="HS256")
    payload = verify_supabase_token(valid_token)
    assert payload["sub"] == "supabase-user-123"

    with pytest.raises(AuthenticationError):
        verify_supabase_token("completely-corrupted-token")


def test_generate_csrf_token() -> None:
    """CSRF token generator produces high-entropy safe strings."""
    token1 = generate_csrf_token()
    token2 = generate_csrf_token()
    assert len(token1) >= 32
    assert token1 != token2


def test_verify_csrf_scenarios() -> None:
    """Test verify_csrf behaves correctly for bearer headers, GET requests, and cookies."""
    # 1. Bearer authorization header bypasses CSRF
    req_bearer = MagicMock(spec=Request)
    req_bearer.headers = {"Authorization": "Bearer some-access-token"}
    verify_csrf(req_bearer)  # No exception

    # 2. GET request bypasses CSRF
    req_get = MagicMock(spec=Request)
    req_get.headers = {}
    req_get.method = "GET"
    verify_csrf(req_get)  # No exception

    # 3. POST request with matching csrf_token cookie and X-CSRF-Token header
    token = generate_csrf_token()
    req_post_valid = MagicMock(spec=Request)
    req_post_valid.headers = {"X-CSRF-Token": token}
    req_post_valid.cookies = {"csrf_token": token}
    req_post_valid.method = "POST"
    verify_csrf(req_post_valid)  # No exception

    # 4. POST request with missing CSRF header or cookie
    req_post_missing = MagicMock(spec=Request)
    req_post_missing.headers = {}
    req_post_missing.cookies = {}
    req_post_missing.method = "POST"
    with pytest.raises(AuthorizationError, match="CSRF verification failed"):
        verify_csrf(req_post_missing)

    # 5. POST request with mismatching CSRF token
    req_post_mismatch = MagicMock(spec=Request)
    req_post_mismatch.headers = {"X-CSRF-Token": "token-A"}
    req_post_mismatch.cookies = {"csrf_token": "token-B"}
    req_post_mismatch.method = "POST"
    with pytest.raises(AuthorizationError, match="CSRF verification failed"):
        verify_csrf(req_post_mismatch)


@pytest.mark.asyncio
async def test_get_current_user_error_conditions(db_session: Any) -> None:
    """Test get_current_user dependency rejects invalid tokens, missing sub, and unknown users."""
    import uuid

    from app.api.deps import get_current_user
    from app.core.security import create_access_token, create_refresh_token

    # 1. No token
    req_empty = MagicMock(spec=Request)
    req_empty.headers = {}
    req_empty.cookies = {}
    with pytest.raises(AuthenticationError, match="Authentication credentials were not provided"):
        await get_current_user(req_empty, db_session)

    # 2. Token type != access (e.g. refresh)
    refresh_token = create_refresh_token({"sub": str(uuid.uuid4())})
    req_refresh = MagicMock(spec=Request)
    req_refresh.headers = {"Authorization": f"Bearer {refresh_token}"}
    req_refresh.cookies = {}
    with pytest.raises(AuthenticationError, match="Invalid token type"):
        await get_current_user(req_refresh, db_session)

    # 3. Missing sub
    settings = get_settings()
    no_sub_token = jwt.encode(
        {"type": "access"}, settings.secret_key, algorithm=settings.jwt_algorithm
    )
    req_no_sub = MagicMock(spec=Request)
    req_no_sub.headers = {"Authorization": f"Bearer {no_sub_token}"}
    req_no_sub.cookies = {}
    with pytest.raises(AuthenticationError, match="Token subject is missing"):
        await get_current_user(req_no_sub, db_session)

    # 4. Invalid UUID sub
    bad_sub_token = jwt.encode(
        {"sub": "not-a-valid-uuid", "type": "access"},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    req_bad_sub = MagicMock(spec=Request)
    req_bad_sub.headers = {"Authorization": f"Bearer {bad_sub_token}"}
    req_bad_sub.cookies = {}
    with pytest.raises(AuthenticationError, match="Invalid token subject format"):
        await get_current_user(req_bad_sub, db_session)

    # 5. Non-existent user
    random_user_token = create_access_token({"sub": str(uuid.uuid4()), "type": "access"})
    req_random = MagicMock(spec=Request)
    req_random.headers = {"Authorization": f"Bearer {random_user_token}"}
    req_random.cookies = {}
    with pytest.raises(AuthenticationError, match="could not be found"):
        await get_current_user(req_random, db_session)


def test_require_role_rejection() -> None:
    """Test require_role rejects users with unauthorized roles."""
    import uuid

    from app.api.deps import require_role
    from app.models.auth import Role, User

    user = User(id=uuid.uuid4(), role=Role(id=uuid.uuid4(), name="student", description="Student"))
    checker = require_role("teacher", "admin")
    with pytest.raises(AuthorizationError, match="Role 'student' is not authorized"):
        checker(user)
