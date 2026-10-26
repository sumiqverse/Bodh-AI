"""Pytest async configuration and fixtures supporting real Postgres or in-memory SQLite."""

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pgvector.sqlalchemy import Vector
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth import Role, User


# Teach SQLite how to compile PostgreSQL-specific types during tests
@compiles(Vector, "sqlite")
def _compile_vector_sqlite(_type: Any, _compiler: Any, **_kw: Any) -> str:
    return "TEXT"


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(_type: Any, _compiler: Any, **_kw: Any) -> str:
    return "TEXT"


@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(_type: Any, _compiler: Any, **_kw: Any) -> str:
    return "CHAR(36)"


class MockRedis:
    """In-memory mock for async Redis operations."""

    def __init__(self) -> None:
        self.data: dict[str, Any] = {}
        self.expirations: dict[str, int] = {}

    async def ping(self) -> bool:
        return True

    async def incr(self, key: str) -> int:
        val = int(self.data.get(key, 0)) + 1
        self.data[key] = val
        return val

    async def expire(self, key: str, seconds: int) -> bool:
        self.expirations[key] = seconds
        return True

    async def get(self, key: str) -> Any:
        return self.data.get(key)

    async def set(self, key: str, value: Any, ex: int | None = None) -> bool:
        self.data[key] = value
        if ex is not None:
            self.expirations[key] = ex
        return True

    async def close(self) -> None:
        self.data.clear()


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Provide an isolated test database engine.
    Uses PostgreSQL if TEST_DATABASE_URL is set, otherwise in-memory SQLite.
    """
    settings = get_settings()
    test_db_url = getattr(settings, "test_database_url", None) or "sqlite+aiosqlite:///:memory:"

    engine = create_async_engine(
        test_db_url,
        connect_args={"check_same_thread": False} if "sqlite" in test_db_url else {},
        poolclass=StaticPool if "sqlite" in test_db_url else None,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Yield an isolated session per test, rolling back any mutations on exit."""
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_redis() -> MockRedis:
    return MockRedis()


@pytest_asyncio.fixture
async def client(
    db_session: AsyncSession,
    mock_redis: MockRedis,
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an asynchronous test client bound to the FastAPI application."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    app.state.redis = mock_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client

    app.dependency_overrides.clear()


async def create_user_with_role(
    session: AsyncSession,
    role_name: str,
    username: str | None = None,
    email: str | None = None,
    is_minor: bool = False,
) -> tuple[User, str]:
    """Helper to create a user with a specific role and generate an access token."""
    stmt = select(Role).where(Role.name == role_name)
    res = await session.execute(stmt)
    role = res.scalar_one_or_none()
    if role is None:
        role = Role(
            id=uuid.uuid4(),
            name=role_name,
            description=f"{role_name} role",
            permissions=["*"] if role_name == "admin" else ["read", "write"],
        )
        session.add(role)
        await session.flush()

    user_id = uuid.uuid4()
    u_name = username or f"{role_name}_{user_id.hex[:6]}"
    u_email = email or (f"{role_name}_{user_id.hex[:6]}@example.com" if not is_minor else None)
    user = User(
        id=user_id,
        role_id=role.id,
        username=u_name,
        email=u_email,
        full_name=f"Test {role_name.capitalize()}",
        is_minor=is_minor,
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    await session.flush()
    token = create_access_token({"sub": str(user.id), "role": role_name})
    return user, token


@pytest_asyncio.fixture
async def student_auth(
    db_session: AsyncSession,
) -> tuple[User, str, dict[str, str]]:
    """Yield a student user, token, and authorization headers."""
    user, token = await create_user_with_role(db_session, "student", is_minor=True)
    return user, token, {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def other_student_auth(
    db_session: AsyncSession,
) -> tuple[User, str, dict[str, str]]:
    """Yield a second distinct student user, token, and headers."""
    user, token = await create_user_with_role(db_session, "student", is_minor=True)
    return user, token, {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def teacher_auth(
    db_session: AsyncSession,
) -> tuple[User, str, dict[str, str]]:
    """Yield a teacher user, token, and authorization headers."""
    user, token = await create_user_with_role(db_session, "teacher")
    return user, token, {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def other_teacher_auth(
    db_session: AsyncSession,
) -> tuple[User, str, dict[str, str]]:
    """Yield a second distinct teacher user, token, and headers."""
    user, token = await create_user_with_role(db_session, "teacher")
    return user, token, {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_auth(
    db_session: AsyncSession,
) -> tuple[User, str, dict[str, str]]:
    """Yield an admin user, token, and authorization headers."""
    user, token = await create_user_with_role(db_session, "admin")
    return user, token, {"Authorization": f"Bearer {token}"}
