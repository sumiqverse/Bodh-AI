"""Authentication routes: Teacher Supabase/email auth, Student join code + PIN sign-in,

and refresh token rotation.
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.core.errors import AccountLockedError, AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_csrf_token,
    hash_secret,
    verify_secret,
    verify_supabase_token,
)
from app.models.auth import User
from app.repositories.audit_repo import AuditRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    RefreshTokenRequest,
    StudentJoinRequest,
    StudentLoginRequest,
    SupabaseAuthRequest,
    TeacherLoginRequest,
    TeacherSignupRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def _build_user_response(user: User) -> UserResponse:
    """Format SQLAlchemy User model into public UserResponse."""
    role_name = user.role.name if user.role is not None else "student"
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=role_name,
        preferred_language=user.preferred_language,
        is_minor=user.is_minor,
        created_at=user.created_at,
    )


def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    """Attach secure HttpOnly cookies for session management."""
    is_prod = settings.app_env == "production"
    # Access token cookie (15 min)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=is_prod,
        samesite="lax",
    )
    # Refresh token cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        httponly=True,
        secure=is_prod,
        samesite="lax",
    )
    # CSRF token cookie (readable by frontend script)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        httponly=False,
        secure=is_prod,
        samesite="lax",
    )


@router.post(
    "/teacher/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new teacher account",
)
async def teacher_signup(
    payload: TeacherSignupRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Create a verified teacher account using Argon2 hashed password."""
    user_repo = UserRepository(session)
    audit_repo = AuditRepository(session)

    existing = await user_repo.get_by_email(payload.email)
    if existing is not None:
        raise ConflictError(f"User with email '{payload.email}' already exists.")

    teacher_role = await user_repo.get_or_create_default_role("teacher")
    user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_secret(payload.password),
        is_active=True,
        is_verified=True,
        is_minor=False,
        preferred_language=payload.preferred_language,
        role_id=teacher_role.id,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user, ["role"])

    client_ip = request.client.host if request.client else None
    await audit_repo.log_action(
        action="teacher_signup",
        resource_type="user",
        resource_id=str(user.id),
        changes={"email": user.email, "role": "teacher"},
        user_id=user.id,
        ip_address=client_ip,
    )

    access_token = create_access_token({"sub": str(user.id), "role": "teacher"})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(user),
    )


def _is_locked(locked_until: datetime | None) -> bool:
    """Check if account is temporarily locked in a timezone-safe manner."""
    if not locked_until:
        return False
    target = locked_until.replace(tzinfo=UTC) if locked_until.tzinfo is None else locked_until
    return target > datetime.now(UTC)


@router.post(
    "/teacher/login",
    response_model=TokenResponse,
    summary="Authenticate a teacher or administrator with email and password",
)
async def teacher_login(
    payload: TeacherLoginRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Validate teacher credentials against Argon2 hash with lockout protection."""
    user_repo = UserRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    user = await user_repo.get_by_email(payload.email)
    if user is None:
        raise AuthenticationError("Invalid email or password.")

    if _is_locked(user.locked_until):
        await audit_repo.log_action(
            action="login_attempt_while_locked",
            resource_type="user",
            resource_id=str(user.id),
            user_id=user.id,
            ip_address=client_ip,
        )
        until_str = user.locked_until.isoformat() if user.locked_until else ""
        raise AccountLockedError(
            f"Account is temporarily locked until {until_str} due to consecutive failed attempts."
        )

    if not user.hashed_password or not verify_secret(user.hashed_password, payload.password):
        await user_repo.record_login_failure(user)
        await audit_repo.log_action(
            action="login_failed",
            resource_type="user",
            resource_id=str(user.id),
            changes={"failed_attempts": user.failed_login_attempts},
            user_id=user.id,
            ip_address=client_ip,
        )
        raise AuthenticationError("Invalid email or password.")

    await user_repo.record_login_success(user)
    await audit_repo.log_action(
        action="login_success",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=client_ip,
    )

    role_name = user.role.name if user.role else "teacher"
    access_token = create_access_token({"sub": str(user.id), "role": role_name})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(user),
    )


@router.post(
    "/student/login",
    response_model=TokenResponse,
    summary="Student sign-in via class join code, username, and PIN",
)
async def student_login(
    payload: StudentLoginRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Minor students sign in using only teacher-issued join code + username + PIN (no email)."""
    class_repo = ClassRepository(session)
    user_repo = UserRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    # 1. Validate join code
    school_class = await class_repo.get_by_join_code(payload.join_code)
    if school_class is None:
        raise NotFoundError("Class with join code", payload.join_code)

    # 2. Find student by username
    student = await user_repo.get_by_username(payload.username)
    if student is None:
        raise AuthenticationError("Invalid username or PIN.")

    # 3. Check lockout
    if _is_locked(student.locked_until):
        s_until = student.locked_until.isoformat() if student.locked_until else ""
        raise AccountLockedError(f"Account is temporarily locked until {s_until}.")

    # 4. Check enrollment in class
    enrollment = await class_repo.get_enrollment(school_class.id, student.id)
    if enrollment is None or enrollment.status == "removed":
        raise AuthenticationError("Student is not enrolled in this classroom.")

    # 5. Verify PIN using Argon2
    if not student.pin_hash or not verify_secret(student.pin_hash, payload.pin):
        await user_repo.record_login_failure(student)
        await audit_repo.log_action(
            action="student_login_failed",
            resource_type="user",
            resource_id=str(student.id),
            user_id=student.id,
            ip_address=client_ip,
        )
        raise AuthenticationError("Invalid username or PIN.")

    await user_repo.record_login_success(student)
    await audit_repo.log_action(
        action="student_login_success",
        resource_type="user",
        resource_id=str(student.id),
        changes={"class_id": str(school_class.id)},
        user_id=student.id,
        ip_address=client_ip,
    )

    access_token = create_access_token({"sub": str(student.id), "role": "student"})
    refresh_token = create_refresh_token({"sub": str(student.id)})
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(student),
    )


@router.post(
    "/student/join",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Student onboarding with join code, chosen username, and PIN",
)
async def student_join(
    payload: StudentJoinRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Self-onboarding for students: joins classroom with join code (no personal email)."""
    class_repo = ClassRepository(session)
    user_repo = UserRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    # 1. Validate join code
    school_class = await class_repo.get_by_join_code(payload.join_code)
    if school_class is None:
        raise NotFoundError("Class with join code", payload.join_code)

    # 2. Check username availability
    existing = await user_repo.get_by_username(payload.username)
    if existing is not None:
        raise ConflictError(
            f"Username '{payload.username}' is already taken. Please choose another."
        )

    # 3. Create student user account
    student_role = await user_repo.get_or_create_default_role("student")
    student = User(
        username=payload.username.strip(),
        full_name=payload.full_name.strip(),
        pin_hash=hash_secret(payload.pin),
        is_minor=True,
        is_active=True,
        is_verified=True,
        preferred_language=payload.preferred_language,
        role_id=student_role.id,
    )
    session.add(student)
    await session.flush()
    await session.refresh(student, ["role"])

    # 4. Create active enrollment
    await class_repo.add_enrollment(
        class_id=school_class.id,
        student_id=student.id,
        status="active",
    )

    await audit_repo.log_action(
        action="student_joined_class",
        resource_type="enrollment",
        resource_id=f"{school_class.id}:{student.id}",
        changes={"class_id": str(school_class.id), "username": student.username},
        user_id=student.id,
        ip_address=client_ip,
    )

    access_token = create_access_token({"sub": str(student.id), "role": "student"})
    refresh_token = create_refresh_token({"sub": str(student.id)})
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(student),
    )


@router.post(
    "/supabase",
    response_model=TokenResponse,
    summary="Authenticate via Supabase OAuth (Google / email) and exchange for BodhAI session",
)
async def supabase_auth_callback(
    payload: SupabaseAuthRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Validate Supabase JWT and synchronize teacher account into BodhAI."""
    token_claims = verify_supabase_token(payload.access_token)
    email = token_claims.get("email")
    if not email:
        raise AuthenticationError("Supabase token does not contain an email address.")

    user_repo = UserRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    user = await user_repo.get_by_email(email)
    if user is None:
        teacher_role = await user_repo.get_or_create_default_role("teacher")
        user_metadata = token_claims.get("user_metadata", {})
        meta_name = user_metadata.get("full_name") or user_metadata.get("name")
        full_name = meta_name or email.split("@")[0]

        user = User(
            email=email.lower().strip(),
            full_name=str(full_name),
            is_active=True,
            is_verified=True,
            is_minor=False,
            role_id=teacher_role.id,
        )
        session.add(user)
        await session.flush()
        await session.refresh(user, ["role"])

    await audit_repo.log_action(
        action="supabase_login_success",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=client_ip,
    )

    role_name = user.role.name if user.role else "teacher"
    access_token = create_access_token({"sub": str(user.id), "role": role_name})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    csrf_token = generate_csrf_token()

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new 15-minute access token",
)
async def refresh_token(
    response: Response,
    payload: RefreshTokenRequest | None = None,
    refresh_token_cookie: Annotated[str | None, Cookie(alias="refresh_token")] = None,
    session: Annotated[AsyncSession, Depends(get_db)] = None,  # type: ignore[assignment]
) -> TokenResponse:
    """Rotate tokens using refresh token rotation."""
    raw_token = (
        payload.refresh_token if payload and payload.refresh_token else None
    ) or refresh_token_cookie
    if not raw_token:
        raise AuthenticationError("Refresh token was not provided.")

    decoded = decode_token(raw_token)
    if decoded.get("type") != "refresh":
        raise AuthenticationError("Invalid token type. A refresh token is required.")

    sub = decoded.get("sub")
    if not sub:
        raise AuthenticationError("Token subject is missing.")

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id_with_role(uuid.UUID(sub))
    if user is None or user.is_deleted or not user.is_active:
        raise AuthenticationError("Associated user account is no longer active.")

    role_name = user.role.name if user.role else "student"
    new_access_token = create_access_token({"sub": str(user.id), "role": role_name})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    new_csrf_token = generate_csrf_token()

    _set_auth_cookies(response, new_access_token, new_refresh_token, new_csrf_token)
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        csrf_token=new_csrf_token,
        user=_build_user_response(user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Clear session cookies and terminate active authentication",
)
async def logout(response: Response) -> dict[str, str]:
    """Clear access, refresh, and CSRF cookies."""
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    response.delete_cookie(key="csrf_token")
    return {"message": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Fetch profile of the currently authenticated user",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return identity and role claims derived strictly from server-side database records."""
    return _build_user_response(current_user)
