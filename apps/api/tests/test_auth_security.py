"""Tests for Security, Auth, Lockout, and DPDP Data Rights."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_join_code,
    hash_secret,
    verify_secret,
)
from app.models.auth import Role, User
from app.models.organization import School
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.user_repo import UserRepository
from tests.factories import SchoolFactory


def test_argon2_hashing_and_verification() -> None:
    """Test Argon2 password and PIN hashing & verification."""
    password = "SuperSecretTeacherPassword123!"
    hashed = hash_secret(password)
    assert hashed != password
    assert verify_secret(password, hashed) is True
    assert verify_secret("WrongPassword", hashed) is False

    pin = "1234"
    pin_hash = hash_secret(pin)
    assert verify_secret(pin, pin_hash) is True
    assert verify_secret("9999", pin_hash) is False


def test_jwt_token_generation_and_decoding() -> None:
    """Test JWT access and refresh token creation and claims decoding."""
    user_id = str(uuid.uuid4())
    access_tok = create_access_token({"sub": user_id, "role": "teacher"})
    decoded = decode_token(access_tok)
    assert decoded["sub"] == user_id
    assert decoded["role"] == "teacher"
    assert decoded["type"] == "access"

    refresh_tok = create_refresh_token({"sub": user_id, "role": "teacher"})
    decoded_refresh = decode_token(refresh_tok)
    assert decoded_refresh["sub"] == user_id
    assert decoded_refresh["type"] == "refresh"


def test_join_code_format() -> None:
    """Test teacher class join code format."""
    code = generate_join_code()
    assert len(code) == 6
    assert code.isalnum()


@pytest.mark.asyncio
async def test_account_lockout_after_five_failures(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verify account locks out for 15 minutes after 5 consecutive failed attempts."""
    # Create teacher
    role_stmt = select(Role).where(Role.name == "teacher")
    res_role = await db_session.execute(role_stmt)
    role = res_role.scalar_one_or_none()
    if role is None:
        role = Role(id=uuid.uuid4(), name="teacher", description="Teacher role", permissions=["*"])
        db_session.add(role)
        await db_session.flush()

    user_repo = UserRepository(db_session)
    await user_repo.create(
        User(
            id=uuid.uuid4(),
            email="lockout_teacher@example.com",
            username="lockout_teacher",
            hashed_password=hash_secret("CorrectPass123!"),
            full_name="Lockout Test Teacher",
            role_id=role.id,
            is_active=True,
            is_verified=True,
        )
    )
    await db_session.commit()

    # 5 consecutive failed attempts trigger lockout
    for _ in range(5):
        res = await client.post(
            "/api/v1/auth/teacher/login",
            json={"email": "lockout_teacher@example.com", "password": "WrongPassword!"},
        )
        assert res.status_code == 401

    # Subsequent attempt while locked returns 429
    res_locked = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": "lockout_teacher@example.com", "password": "CorrectPass123!"},
    )
    assert res_locked.status_code == 429
    assert "locked" in res_locked.json()["detail"].lower()


@pytest.mark.asyncio
async def test_student_join_and_login_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test full student join-code registration and subsequent username+PIN login."""
    teacher, _, _ = teacher_auth
    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    classroom = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Grade 8 Science",
        grade=8,
        section="A",
        academic_year="2024-2025",
    )
    await db_session.commit()

    # Student joins with class join code
    join_payload = {
        "join_code": classroom.join_code,
        "username": f"student_rahul_{uuid.uuid4().hex[:4]}",
        "pin": "4321",
        "full_name": "Rahul Verma",
        "roll_number": "12",
        "preferred_language": "hi",
    }
    join_res = await client.post("/api/v1/auth/student/join", json=join_payload)
    assert join_res.status_code == 201
    join_data = join_res.json()
    assert "access_token" in join_data
    assert join_data["user"]["role"] == "student"

    # Student logs in with username + PIN
    login_res = await client.post(
        "/api/v1/auth/student/login",
        json={
            "join_code": classroom.join_code,
            "username": join_payload["username"],
            "pin": "4321",
        },
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["username"] == join_payload["username"]


@pytest.mark.asyncio
async def test_token_refresh_rotation(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify refresh token rotation returns new access token and new rotated refresh token."""
    student, _, _ = student_auth
    refresh_token = create_refresh_token({"sub": str(student.id), "role": "student"})

    res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != refresh_token


@pytest.mark.asyncio
async def test_dpDP_data_rights_export_and_deletion(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify DPDP export returns valid student JSON and delete anonymizes the account."""
    student, _, headers = student_auth

    # 1. Export Data
    export_res = await client.get(f"/api/v1/data-rights/export/{student.id}", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["student_id"] == str(student.id)
    assert "attempts" in export_data
    assert "mastery" in export_data
    assert "consents" in export_data

    # 2. Request Deletion / Anonymization
    delete_res = await client.post(f"/api/v1/data-rights/delete/{student.id}", headers=headers)
    assert delete_res.status_code == 200
    del_data = delete_res.json()
    assert del_data["status"] == "anonymized"

    # User check: full_name and credentials anonymized and soft-deleted
    res_user = await db_session.execute(select(User).where(User.id == student.id))
    updated_user = res_user.scalar_one_or_none()
    assert updated_user is not None
    assert "Anonymized Student" in updated_user.full_name
    assert updated_user.pin_hash is None
    assert updated_user.is_active is False
    assert updated_user.is_deleted is True


@pytest.mark.asyncio
async def test_teacher_signup_flow(
    client: AsyncClient,
) -> None:
    """Test self-registration for teachers with Argon2 hashing and cookie delivery."""
    email = f"signup_teacher_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Pooja Sharma",
        "preferred_language": "hi",
    }
    res = await client.post("/api/v1/auth/teacher/signup", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "teacher"
    assert data["user"]["email"] == email

    # Test teacher login with email + password
    login_res = await client.post(
        "/api/v1/auth/teacher/login",
        json={"email": email, "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email

    # Test /me endpoint
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == email
    assert me_data["role"] == "teacher"


@pytest.mark.asyncio
async def test_auth_logout(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test logging out clears cookies."""
    _, _, headers = student_auth
    res = await client.post("/api/v1/auth/logout", headers=headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_consent_withdrawal_flow(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test granting and withdrawing guardian consent under DPDP Act."""
    student, _, headers = student_auth

    # Grant verifiable guardian consent via API
    grant_res = await client.post(
        "/api/v1/consents",
        json={
            "student_id": str(student.id),
            "guardian_name": "Suresh Verma",
            "guardian_phone": "+919876543210",
            "guardian_relationship": "Father",
            "scopes": ["diagnostic", "learning"],
            "version": "2024.1",
        },
        headers=headers,
    )
    assert grant_res.status_code == 201
    assert len(grant_res.json()) == 2
    assert grant_res.json()[0]["guardian_name"] == "Suresh Verma"

    # Withdraw consent via API
    res = await client.post(
        "/api/v1/consents/withdraw",
        json={"student_id": str(student.id), "scope": "learning"},
        headers=headers,
    )
    assert res.status_code == 200
    revoked = res.json()
    assert "withdrawn" in revoked["message"].lower()

    # List consents for student
    list_res = await client.get(f"/api/v1/consents/student/{student.id}", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2


@pytest.mark.asyncio
async def test_class_join_code_rotation_and_approval_api(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test teacher creating class, listing, rotating codes and approving enrollments."""
    _teacher, _, teacher_h = teacher_auth
    student, _, _ = student_auth

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    # Teacher creates class via API
    create_res = await client.post(
        "/api/v1/classes",
        json={
            "name": "Coverage Math Class",
            "grade": 9,
            "section": "C",
            "academic_year": "2024-2025",
            "school_id": str(school.id),
        },
        headers=teacher_h,
    )
    assert create_res.status_code == 201
    classroom_data = create_res.json()
    class_id = classroom_data["id"]
    old_join_code = classroom_data["join_code"]

    # Teacher lists classes
    list_res = await client.get("/api/v1/classes", headers=teacher_h)
    assert list_res.status_code == 200
    assert any(c["id"] == class_id for c in list_res.json())

    from app.models.organization import Enrollment
    from tests.factories import EnrollmentFactory

    enr_repo = BaseRepository[Enrollment](Enrollment, db_session)
    await enr_repo.create(
        EnrollmentFactory.build(
            class_id=uuid.UUID(class_id),
            student_id=student.id,
            status="pending",
        )
    )
    await db_session.commit()

    # Rotate code
    rot_res = await client.post(f"/api/v1/classes/{class_id}/rotate-code", headers=teacher_h)
    assert rot_res.status_code == 200
    rot_data = rot_res.json()
    assert rot_data["join_code"] != old_join_code

    # Approve enrollment
    appr_res = await client.post(
        f"/api/v1/classes/{class_id}/approve/{student.id}",
        headers=teacher_h,
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "active"

    # Fetch class details (roster)
    det_res = await client.get(f"/api/v1/classes/{class_id}", headers=teacher_h)
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert len(det_data["students"]) == 1
    assert det_data["students"][0]["status"] == "active"

    # Remove student from classroom roster
    rem_res = await client.delete(
        f"/api/v1/classes/{class_id}/students/{student.id}",
        headers=teacher_h,
    )
    assert rem_res.status_code == 200
    assert rem_res.json()["status"] == "removed"


@pytest.mark.asyncio
async def test_student_multi_class_join_and_login_without_code(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test student multi-class onboarding and sign-in without requiring a join code."""
    _, _, teacher_h = teacher_auth

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    # Create Class 1
    c1_res = await client.post(
        "/api/v1/classes",
        json={
            "name": "Class 8-A Mathematics",
            "grade": 8,
            "section": "A",
            "academic_year": "2024-2025",
            "school_id": str(school.id),
        },
        headers=teacher_h,
    )
    assert c1_res.status_code == 201
    code1 = c1_res.json()["join_code"]

    # Create Class 2
    c2_res = await client.post(
        "/api/v1/classes",
        json={
            "name": "Class 8-B English",
            "grade": 8,
            "section": "B",
            "academic_year": "2024-2025",
            "school_id": str(school.id),
        },
        headers=teacher_h,
    )
    assert c2_res.status_code == 201
    code2 = c2_res.json()["join_code"]

    # Student joins Class 1 (new registration)
    stu_user = f"multistudent_{uuid.uuid4().hex[:6]}"
    pin = "1234"
    join1_res = await client.post(
        "/api/v1/auth/student/join",
        json={
            "join_code": code1,
            "username": stu_user,
            "pin": pin,
            "full_name": "Multi Class Student",
        },
    )
    assert join1_res.status_code == 201
    tok1 = join1_res.json()["access_token"]

    # Student joins Class 2 with same username and pin (multi-class enrollment)
    join2_res = await client.post(
        "/api/v1/auth/student/join",
        json={
            "join_code": code2,
            "username": stu_user,
            "pin": pin,
            "full_name": "Multi Class Student",
        },
    )
    assert join2_res.status_code == 201

    # Student logs in with ONLY username and PIN (no join code required)
    login_res = await client.post(
        "/api/v1/auth/student/login",
        json={
            "username": stu_user,
            "pin": pin,
        },
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Verify student profile returns all enrolled classes
    prof_res = await client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {tok1}"},
    )
    assert prof_res.status_code == 200
    p_data = prof_res.json()["profile"]
    assert "classes" in p_data
    assert len(p_data["classes"]) >= 2


@pytest.mark.asyncio
async def test_student_pending_enrollment_blocks_diagnostic_until_approved(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test that a pending student cannot start diagnostic/practice until educator approves."""
    _, _, teacher_h = teacher_auth

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    # Create Class
    c_res = await client.post(
        "/api/v1/classes",
        json={
            "name": "Class 8-A Mathematics",
            "grade": 8,
            "section": "C",
            "academic_year": "2024-2025",
            "school_id": str(school.id),
        },
        headers=teacher_h,
    )
    assert c_res.status_code == 201
    class_id = c_res.json()["id"]
    code = c_res.json()["join_code"]

    # Student joins
    stu_user = f"pending_stu_{uuid.uuid4().hex[:6]}"
    pin = "1234"
    join_res = await client.post(
        "/api/v1/auth/student/join",
        json={
            "join_code": code,
            "username": stu_user,
            "pin": pin,
            "full_name": "Pending Student",
        },
    )
    assert join_res.status_code == 201
    tok = join_res.json()["access_token"]
    student_h = {"Authorization": f"Bearer {tok}"}

    # Attempt to start diagnostic before approval -> Should return 403 Forbidden
    diag_blocked = await client.post(
        "/api/v1/diagnostics",
        json={"curriculum_code": "NCERT-MATH-C8"},
        headers=student_h,
    )
    assert diag_blocked.status_code == 403
    assert "pending educator approval" in diag_blocked.json()["detail"].lower()

    # Get student user id from profile
    prof_res = await client.get("/api/v1/profiles/me", headers=student_h)
    assert prof_res.status_code == 200
    student_id = prof_res.json()["profile"]["id"]

    # Teacher approves student
    app_res = await client.post(
        f"/api/v1/classes/{class_id}/approve/{student_id}",
        headers=teacher_h,
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "active"

    # Now student can start diagnostic!
    diag_ok = await client.post(
        "/api/v1/diagnostics",
        json={"curriculum_code": "NCERT-MATH-C8"},
        headers=student_h,
    )
    assert diag_ok.status_code == 200
    assert "session_id" in diag_ok.json()
