"""Class, roster, and school analytics schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ClassCreateRequest(BaseModel):
    """Payload for teacher creating a new classroom."""

    name: str = Field(min_length=2, max_length=100, description="e.g. Class 8-A Mathematics")
    grade: int = Field(ge=6, le=10, description="Grade level (Classes 6 to 10)")
    section: str = Field(min_length=1, max_length=10, description="e.g. 'A', 'B'")
    subject: str | None = Field(default=None, min_length=1, max_length=50)
    academic_year: str = Field(
        default="2024-2025", min_length=4, max_length=20, description="Academic session"
    )
    school_id: uuid.UUID | None = None


class ClassResponse(BaseModel):
    """Class summary response."""

    id: uuid.UUID
    name: str
    grade: int
    section: str
    subject: str | None = None
    academic_year: str
    join_code: str
    school_id: uuid.UUID
    teacher_id: uuid.UUID
    created_at: datetime


class StudentRosterItem(BaseModel):
    """Student roster entry within a classroom."""

    student_id: uuid.UUID
    full_name: str
    username: str | None
    roll_number: str | None
    status: str
    enrolled_at: datetime


class ClassDetailResponse(BaseModel):
    """Detailed classroom information with student roster."""

    id: uuid.UUID
    name: str
    grade: int
    section: str
    subject: str | None = None
    academic_year: str
    join_code: str
    school_id: uuid.UUID
    teacher_id: uuid.UUID
    students: list[StudentRosterItem]
    total_students: int
    created_at: datetime


class RotateCodeResponse(BaseModel):
    """Response returned upon generating a new join code."""

    class_id: uuid.UUID
    join_code: str
    message: str


class EnrollmentActionResponse(BaseModel):
    """Result of teacher approving or removing a student from a class."""

    class_id: uuid.UUID
    student_id: uuid.UUID
    status: str
    message: str


class AdminSchoolStatsResponse(BaseModel):
    """Aggregate school analytics without student PII."""

    total_schools: int
    total_classes: int
    total_students: int
    total_attempts: int
    average_mastery: float
    grade_distribution: dict[int, int]


class AuditLogItemResponse(BaseModel):
    """Single security or compliance audit log record."""

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str
    changes: dict[str, object]
    ip_address: str | None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    """Paginated list of security audit log records."""

    total: int
    items: list[AuditLogItemResponse]
    limit: int
    offset: int


class LeaderboardStudentItem(BaseModel):
    """Ranked student item in classroom leaderboard."""

    rank: int
    student_id: uuid.UUID
    name: str
    username: str | None = None
    roll_number: str | None = None
    xp: int
    streak_days: int = 1
    avatar_bg: str = "bg-surface-yellow"
    is_current_user: bool = False


class ClassLeaderboardResponse(BaseModel):
    """Real classroom leaderboard ranking for enrolled cohort."""

    class_id: uuid.UUID
    class_name: str
    total_students: int
    top_three: list[LeaderboardStudentItem]
    list_learners: list[LeaderboardStudentItem]
    all_rankings: list[LeaderboardStudentItem]
    current_user_row: LeaderboardStudentItem | None = None
    activity_dates: list[str] = Field(default_factory=list)
    max_streak: int = 0


class ClassroomLessonUpsert(BaseModel):
    skill_id: uuid.UUID
    language: str = Field(pattern="^(en|hi)$")
    difficulty: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=30000)
