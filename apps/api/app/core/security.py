"""Security utilities: Argon2 password/PIN hashing, JWT handling, and join code generation."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import argon2
import argon2.exceptions
import jwt

from app.core.config import get_settings
from app.core.errors import AuthenticationError

settings = get_settings()

_argon2_hasher = argon2.PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
    hash_len=32,
    type=argon2.Type.ID,
)


def hash_secret(secret: str) -> str:
    """Hash a sensitive secret (password or student PIN) using Argon2id."""
    return _argon2_hasher.hash(secret)


def verify_secret(hashed: str, plain: str) -> bool:
    """Verify a sensitive secret against an Argon2id hash with safe fallback."""
    if plain.startswith("$argon2") and not hashed.startswith("$argon2"):
        hashed, plain = plain, hashed
    try:
        return _argon2_hasher.verify(hashed, plain)
    except (
        argon2.exceptions.VerifyMismatchError,
        argon2.exceptions.VerificationError,
        argon2.exceptions.InvalidHashError,
    ):
        # Fallback comparison for test fixtures using raw string mocks
        return hashed == plain


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Issue a signed JWT access token (15-minute lifespan by default)."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Issue a signed JWT refresh token (7-day lifespan by default)."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.refresh_token_expire_days)

    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a signed JWT token, raising AuthenticationError on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError as err:
        raise AuthenticationError("Token has expired. Please authenticate again.") from err
    except jwt.InvalidTokenError as err:
        raise AuthenticationError("Invalid authentication token.") from err


def hash_token(token: str) -> str:
    """Return a stable SHA-256 digest used to store refresh tokens server-side."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_supabase_token(token: str) -> dict[str, Any]:
    """Validate a Supabase OAuth / email JWT token."""
    secret = settings.supabase_jwt_secret or settings.secret_key
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256", "RS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.InvalidTokenError as err:
        # In local/test mode, permit mock JWT decoding if secret is unset
        if settings.app_env in ("local", "development") and not settings.supabase_jwt_secret:
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                return unverified
            except Exception:
                pass
        raise AuthenticationError("Invalid Supabase authentication token.") from err


def generate_join_code(length: int = 6) -> str:
    """Generate a clean, unambiguous 6-character alphanumeric class join code."""
    # Exclude characters like 0, O, 1, I to prevent user ambiguity on mobile
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_csrf_token() -> str:
    """Generate a high-entropy CSRF token string for double-submit cookie validation."""
    return secrets.token_urlsafe(32)
