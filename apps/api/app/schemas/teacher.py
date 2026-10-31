"""Pydantic schemas for Teacher Dashboard, analytics, assignments, and decision audits."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# --- Heatmap Schemas ---
class HeatmapStudent(BaseModel):
    student_id: uuid.UUID
    full_name: str
    username: str
    student_name: str | None = None
    roll_number: str | None = None

    def model_post_init(self, __context: Any) -> None:
        if not self.student_name:
            self.student_name = self.full_name or self.username or "Student"


class HeatmapSkill(BaseModel):
    skill_id: uuid.UUID
    code: str
    name: str
    skill_code: str | None = None
    skill_name: str | None = None
    topic_name: str
    difficulty: float

    def model_post_init(self, __context: Any) -> None:
        if not self.skill_code:
            self.skill_code = self.code
        if not self.skill_name:
            self.skill_name = self.name


class HeatmapCell(BaseModel):
    student_id: uuid.UUID
    skill_id: uuid.UUID
    state: str = Field(description="not_learned, partial, mastered")
    p_mastery: float
    confidence: float
    attempts_count: int
    last_attempted_at: datetime | None = None


class ClassHeatmapResponse(BaseModel):
    class_id: uuid.UUID
    total_students: int
    total_skills: int
    students: list[HeatmapStudent]
    skills: list[HeatmapSkill]
    matrix: list[HeatmapCell]
    summary: dict[str, int] = Field(
        default_factory=dict,
        description="Mastery state distribution: {'mastered': X, 'partial': Y, 'not_learned': Z}",
    )


# --- Group-Gap Cluster Schemas ---
class GapClusterItem(BaseModel):
    cluster_id: str
    skill_id: uuid.UUID
    skill_code: str
    skill_name: str
    topic_name: str
    student_count: int
    student_ids: list[uuid.UUID]
    student_names: list[str]
    average_p_mastery: float
    suggested_revision_plan: dict[str, Any] = Field(
        default_factory=dict,
        description="Suggested pedagogical revision strategy for this group gap",
    )


class ClassGapClustersResponse(BaseModel):
    class_id: uuid.UUID
    total_clusters: int
    clusters: list[GapClusterItem]


# --- Early Warning Schemas ---
class EarlyWarningItem(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: str | None = None
    warning_type: str = Field(description="stalled, dropped, inactive")
    skill_id: uuid.UUID | None = None
    skill_name: str | None = None
    days_inactive_or_stalled: int
    message: str
    suggested_action: str


class ClassEarlyWarningsResponse(BaseModel):
    class_id: uuid.UUID
    threshold_days: int
    warnings: list[EarlyWarningItem]


# --- Student Profile Schemas ---
class ErrorPatternItem(BaseModel):
    question_code: str
    prompt_excerpt: str
    distractor_chosen: str
    count: int
    misconception: str


class HintUsageSummary(BaseModel):
    total_hints_requested: int
    hint_1_count: int
    hint_2_count: int
    hint_3_count: int
    independent_attempts_count: int


class MasteryTrendPoint(BaseModel):
    date: str
    p_mastery: float
    attempts: int


class StudentProfileSkillItem(BaseModel):
    skill_id: uuid.UUID
    skill_code: str
    skill_name: str
    state: str
    p_mastery: float
    attempts_count: int
    last_attempted_at: datetime | None = None


class StudentProfileResponse(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: str | None = None
    skills: list[StudentProfileSkillItem]
    error_patterns: list[ErrorPatternItem]
    hint_usage: HintUsageSummary
    trend: list[MasteryTrendPoint]
    summary: dict[str, Any] = Field(default_factory=dict)


# --- Engine Suggestions & Decision Hub ---
class SuggestionItem(BaseModel):
    suggestion_id: str
    student_id: uuid.UUID | None = None
    student_name: str | None = None
    skill_id: uuid.UUID
    skill_code: str
    skill_name: str
    title: str
    evidence: dict[str, Any]
    rationale: str
    recommended_action: str
    is_ai_suggestion: bool = True
    disclaimer: str = (
        "AI Suggestion — Teacher Advisory Only. No grades or promotion decisions produced."
    )
    status: str = Field(
        default="pending", description="pending, accepted, edited, ignored, overridden"
    )


class ClassSuggestionsResponse(BaseModel):
    class_id: uuid.UUID
    suggestions: list[SuggestionItem]


class TeacherDecisionCreateRequest(BaseModel):
    action: str = Field(description="accepted, edited, ignored, overridden")
    student_id: uuid.UUID | None = None
    evidence: dict[str, Any] = Field(default_factory=dict)
    rationale: str = ""
    teacher_notes: str | None = None
    custom_payload: dict[str, Any] | None = None


class TeacherDecisionResponse(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    teacher_id: uuid.UUID
    student_id: uuid.UUID | None = None
    suggestion_id: str
    action: str
    teacher_notes: str | None = None
    created_at: datetime


# --- Assignment Schemas ---
class AssignmentCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    skill_ids: list[str] = Field(min_length=1)
    student_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Target student UUIDs; if empty or null, applies to entire class roster",
    )
    due_date: datetime | None = None


class AssignmentStudentItem(BaseModel):
    student_id: uuid.UUID
    student_name: str
    status: str
    completed_at: datetime | None = None


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    title: str
    description: str | None = None
    skill_ids: list[str]
    due_date: datetime | None = None
    status: str
    total_assigned: int
    completed_count: int
    students: list[AssignmentStudentItem] = Field(default_factory=list)
    created_at: datetime


# --- Progress Summary Schemas ---
class ClassProgressSummaryResponse(BaseModel):
    class_id: uuid.UUID
    total_students: int
    total_attempts: int
    overall_mastery_pct: float
    mastered_skills_avg: float
    reassessment_growth_pct: float
    timeline: list[dict[str, Any]] = Field(default_factory=list)
