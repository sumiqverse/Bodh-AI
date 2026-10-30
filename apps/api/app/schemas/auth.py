"""Authentication request and response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """User account entity view."""

    id: uuid.UUID
    email: str | None = None
    username: str | None = None
    full_name: str
    role: str
    preferred_language: str
    is_minor: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """Token payload returned on successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    csrf_token: str
    user: UserResponse


class TeacherSignupRequest(BaseModel):
    """Registration payload for teachers."""

    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters password")
    full_name: str = Field(min_length=2, max_length=150)
    school_id: uuid.UUID | None = None
    preferred_language: str = Field(default="en", max_length=10)


class TeacherLoginRequest(BaseModel):
    """Login payload for teachers and school administrators."""

    email: EmailStr
    password: str


class StudentLoginRequest(BaseModel):
    """Sign-in payload for minor students using class join code and PIN."""

    join_code: str | None = Field(default=None, description="Optional teacher-issued class code")
    username: str = Field(min_length=3, max_length=50, description="Student unique username")
    pin: str = Field(min_length=4, max_length=8, description="Student PIN")


class StudentJoinRequest(BaseModel):
    """Self-registration payload for students joining a class with code."""

    join_code: str = Field(min_length=4, max_length=12, description="Teacher-issued class code")
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    pin: str = Field(min_length=4, max_length=8, description="4 to 8 digit secret PIN")
    full_name: str = Field(min_length=2, max_length=150, description="Student display name")
    preferred_language: str = Field(default="en", max_length=10)


class SupabaseAuthRequest(BaseModel):
    """Payload for validating external Supabase / Google OAuth JWT."""

    access_token: str = Field(description="Supabase access token")


class RefreshTokenRequest(BaseModel):
    """Payload for rotating access tokens."""

    refresh_token: str | None = Field(default=None, description="JWT refresh token")


class ResetPasswordRequest(BaseModel):
    """Payload for updating or recovering user password."""

    email: EmailStr
    new_password: str = Field(
        min_length=8,
        max_length=128,
        description="Minimum 8 characters password",
    )
