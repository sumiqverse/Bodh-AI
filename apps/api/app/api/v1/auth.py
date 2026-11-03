"""Authentication routes: Teacher Supabase/email auth, Student join code + PIN sign-in,

and refresh token rotation.
"""

import hmac
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
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
    hash_token,
    verify_secret,
    verify_supabase_token,
)
from app.models.auth import Session, User
from app.models.organization import Enrollment
from app.repositories.audit_repo import AuditRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    RefreshTokenRequest,
    ResetPasswordRequest,
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


def _as_utc(value: datetime) -> datetime:
    """Normalize SQLite-returned naive timestamps to UTC."""
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


async def _issue_session(
    session: AsyncSession,
    user: User,
    request: Request,
    response: Response,
    role_name: str,
) -> tuple[str, str, str]:
    """Create a revocable server-side session and attach its cookies."""
    session_id = uuid.uuid4()
    refresh_token = create_refresh_token({"sub": str(user.id), "jti": str(session_id)})
    session.add(
        Session(
            id=session_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            ip_address=request.client.host if request.client else None,
            user_agent=(request.headers.get("user-agent") or "")[:500] or None,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
            is_revoked=False,
        )
    )
    await session.flush()

    access_token = create_access_token(
        {"sub": str(user.id), "role": role_name, "sid": str(session_id)}
    )
    csrf_token = generate_csrf_token()
    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return access_token, refresh_token, csrf_token


async def _delete_session(session: AsyncSession, session_id: uuid.UUID) -> None:
    """Delete one session so a logged-out token cannot be replayed."""
    record = await session.get(Session, session_id)
    if record is not None:
        await session.delete(record)
        await session.flush()


async def _revoke_all_sessions(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Revoke every session for a user after refresh-token reuse."""
    await session.execute(
        update(Session)
        .where(Session.user_id == user_id, Session.is_revoked == False)  # noqa: E712
        .values(is_revoked=True)
    )
    await session.flush()


async def _delete_from_token(
    session: AsyncSession,
    token: str | None,
    expected_type: str,
) -> None:
    """Best-effort session deletion from a signed access or refresh token."""
    if not token:
        return
    try:
        decoded = decode_token(token)
    except AuthenticationError:
        return
    if decoded.get("type") != expected_type:
        return
    claim = "sid" if expected_type == "access" else "jti"
    raw_id = decoded.get(claim)
    if not raw_id:
        return
    try:
        session_id = uuid.UUID(str(raw_id))
    except ValueError:
        return
    await _delete_session(session, session_id)


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

    access_token, refresh_token, csrf_token = await _issue_session(
        session, user, request, response, role_name="teacher"
    )
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
    access_token, refresh_token, csrf_token = await _issue_session(
        session, user, request, response, role_name=role_name
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        csrf_token=csrf_token,
        user=_build_user_response(user),
    )


@router.post(
    "/reset-password",
    response_model=TokenResponse,
    summary="Reset password for an existing educator or student account",
    status_code=status.HTTP_200_OK,
)
async def reset_password(
    _payload: ResetPasswordRequest,
) -> TokenResponse:
    """Recovery requires a verified reset token, which is not configured yet."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Password recovery is unavailable until verified reset is configured.",
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

    # 1. Find student by username
    student = await user_repo.get_by_username(payload.username.strip())
    if student is None:
        raise AuthenticationError("Invalid username or PIN.")

    # 2. Check lockout
    if _is_locked(student.locked_until):
        s_until = student.locked_until.isoformat() if student.locked_until else ""
        raise AccountLockedError(f"Account is temporarily locked until {s_until}.")

    # 3. Verify PIN using Argon2
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

    # 4. Resolve classroom enrollment (optional join_code)
    school_class_id_str: str | None = None
    if payload.join_code and payload.join_code.strip():
        school_class = await class_repo.get_by_join_code(payload.join_code.strip().upper())
        if school_class is None:
            raise NotFoundError("Class with join code", payload.join_code)
        enrollment = await class_repo.get_enrollment(school_class.id, student.id)
        if enrollment is None or enrollment.status == "removed":
            # Auto-enroll in new class if not already enrolled
            await class_repo.add_enrollment(school_class.id, student.id, status="pending")
        school_class_id_str = str(school_class.id)
    else:
        # Retrieve student's existing active or pending classroom enrollment
        enr_stmt = (
            select(Enrollment)
            .where(
                Enrollment.student_id == student.id,
                Enrollment.status.in_(["active", "pending"]),
            )
            .order_by(Enrollment.created_at.desc())
            .limit(1)
        )
        enr = (await session.execute(enr_stmt)).scalar_one_or_none()
        if enr:
            school_class_id_str = str(enr.class_id)

    await user_repo.record_login_success(student)
    await audit_repo.log_action(
        action="student_login_success",
        resource_type="user",
        resource_id=str(student.id),
        changes={"class_id": school_class_id_str} if school_class_id_str else {},
        user_id=student.id,
        ip_address=client_ip,
    )

    await user_repo.record_login_success(student)
    access_token, refresh_token, csrf_token = await _issue_session(
        session, student, request, response, role_name="student"
    )
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
    clean_code = payload.join_code.strip().upper()
    school_class = await class_repo.get_by_join_code(clean_code)
    if school_class is None:
        raise NotFoundError("Class with join code", clean_code)

    # 2. Check if student already exists
    existing = await user_repo.get_by_username(payload.username.strip())
    if existing is not None:
        if _is_locked(existing.locked_until):
            s_until = existing.locked_until.isoformat() if existing.locked_until else ""
            raise AccountLockedError(f"Account is temporarily locked until {s_until}.")
        # Verify PIN against existing student credentials
        if not existing.pin_hash or not verify_secret(existing.pin_hash, payload.pin.strip()):
            await user_repo.record_login_failure(existing)
            await audit_repo.log_action(
                action="student_join_failed",
                resource_type="user",
                resource_id=str(existing.id),
                user_id=existing.id,
                ip_address=client_ip,
            )
            raise AuthenticationError("Invalid username or PIN.")
        student = existing
        # Check enrollment in target class
        existing_enr = await class_repo.get_enrollment(school_class.id, student.id)
        if existing_enr is None:
            await class_repo.add_enrollment(
                class_id=school_class.id,
                student_id=student.id,
                status="pending",
            )
            await audit_repo.log_action(
                action="student_joined_class",
                resource_type="enrollment",
                resource_id=f"{school_class.id}:{student.id}",
                changes={"class_id": str(school_class.id), "username": student.username},
                user_id=student.id,
                ip_address=client_ip,
            )
        elif existing_enr.status == "removed":
            existing_enr.status = "pending"
            session.add(existing_enr)
            await session.flush()
    else:
        # 3. Create student user account
        student_role = await user_repo.get_or_create_default_role("student")
        student = User(
            username=payload.username.strip(),
            full_name=payload.full_name.strip(),
            pin_hash=hash_secret(payload.pin.strip()),
            is_minor=True,
            is_active=True,
            is_verified=True,
            preferred_language=payload.preferred_language,
            role_id=student_role.id,
        )
        session.add(student)
        await session.flush()
        await session.refresh(student, ["role"])

        # 4. Create pending enrollment for teacher approval
        await class_repo.add_enrollment(
            class_id=school_class.id,
            student_id=student.id,
            status="pending",
        )

        await audit_repo.log_action(
            action="student_joined_class",
            resource_type="enrollment",
            resource_id=f"{school_class.id}:{student.id}",
            changes={"class_id": str(school_class.id), "username": student.username},
            user_id=student.id,
            ip_address=client_ip,
        )

    await user_repo.record_login_success(student)
    access_token, refresh_token, csrf_token = await _issue_session(
        session, student, request, response, role_name="student"
    )
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
    access_token, refresh_token, csrf_token = await _issue_session(
        session, user, request, response, role_name=role_name
    )
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
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    refresh_token_cookie: Annotated[str | None, Cookie(alias="refresh_token")] = None,
    session: Annotated[AsyncSession, Depends(get_db)] = None,  # type: ignore[assignment]
) -> TokenResponse:
    """Rotate a single-use refresh token and revoke all sessions on reuse."""
    raw_token = (
        payload.refresh_token if payload and payload.refresh_token else None
    ) or refresh_token_cookie
    if not raw_token:
        raise AuthenticationError("Refresh token was not provided.")

    decoded = decode_token(raw_token)
    if decoded.get("type") != "refresh":
        raise AuthenticationError("Invalid token type. A refresh token is required.")

    sub = decoded.get("sub")
    jti = decoded.get("jti")
    if not sub or not jti:
        raise AuthenticationError("Refresh token is missing required claims.")

    try:
        user_id = uuid.UUID(str(sub))
        session_id = uuid.UUID(str(jti))
    except ValueError as err:
        raise AuthenticationError("Refresh token contains malformed claims.") from err

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id_with_role(user_id)
    if user is None or user.is_deleted or not user.is_active:
        raise AuthenticationError("Associated user account is no longer active.")

    session_record = await session.get(Session, session_id)
    if (
        session_record is None
        or session_record.user_id != user.id
        or _as_utc(session_record.expires_at) <= datetime.now(UTC)
    ):
        raise AuthenticationError("Refresh token is invalid or expired.")

    if session_record.is_revoked:
        await _revoke_all_sessions(session, user.id)
        raise AuthenticationError("Refresh token has been revoked. Please sign in again.")

    if not hmac.compare_digest(session_record.token_hash, hash_token(raw_token)):
        await _revoke_all_sessions(session, user.id)
        raise AuthenticationError("Refresh token reuse detected. All sessions revoked.")

    session_record.is_revoked = True
    await session.flush()

    role_name = user.role.name if user.role else "student"
    new_access_token, new_refresh_token, new_csrf_token = await _issue_session(
        session, user, request, response, role_name=role_name
    )
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
async def logout(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db)],
    refresh_token_cookie: Annotated[str | None, Cookie(alias="refresh_token")] = None,
) -> dict[str, str]:
    """Revoke the active session before clearing browser cookies."""
    auth_header = request.headers.get("Authorization")
    access_token = (
        auth_header[7:].strip()
        if auth_header and auth_header.startswith("Bearer ")
        else request.cookies.get("access_token")
    )
    await _delete_from_token(session, access_token, "access")
    await _delete_from_token(session, refresh_token_cookie, "refresh")

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
