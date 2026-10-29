"""Educational Profiles API Router: Student and Teacher profiles with distinct competencies and telemetry."""

import uuid
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/profiles", tags=["Educational Profiles"])


class SkillTelemetry(BaseModel):
    skill_id: str
    skill_code: str
    skill_name: str
    topic_name: str
    difficulty: int
    p_mastery: float
    state: str
    attempts_count: int


class ErrorPattern(BaseModel):
    question_code: str
    prompt_excerpt: str
    distractor_chosen: str
    count: int
    misconception: str
    remedy: str


class HintTelemetry(BaseModel):
    total_hints: int
    hint_1: int
    hint_2: int
    hint_3: int
    independent: int
    independence_ratio: float


class StudentProfileDTO(BaseModel):
    id: str
    slug: str
    full_name: str
    full_name_hi: str
    roll_number: str
    grade: int
    section: str
    school_name: str
    overall_mastery: int
    learning_streak_days: int
    accuracy_rate: int
    total_questions_solved: int
    practice_hours: float
    assigned_teacher_name: str
    skills: list[SkillTelemetry]
    error_patterns: list[ErrorPattern]
    hint_usage: HintTelemetry
    summary: dict[str, Any] = Field(default_factory=dict)


class TeacherProfileDTO(BaseModel):
    id: str
    slug: str
    full_name: str
    full_name_hi: str
    title: str
    employee_id: str
    school_name: str
    department: str = "Mathematics"
    experience_years: int
    total_students: int
    active_classes: int
    avg_mastery: float


STUDENTS_DB: list[dict[str, Any]] = [
    {
        "id": "stu-001",
        "slug": "stu-aarav-sharma",
        "full_name": "Aarav Sharma",
        "full_name_hi": "आरव शर्मा",
        "roll_number": "101",
        "grade": 8,
        "section": "A",
        "school_name": "Govt. Model Senior Secondary School, Delhi",
        "overall_mastery": 78,
        "learning_streak_days": 16,
        "accuracy_rate": 84,
        "total_questions_solved": 342,
        "practice_hours": 28.5,
        "assigned_teacher_name": "Mr. Rajesh Kumar",
        "skills": [
            {
                "skill_id": "sk-01",
                "skill_code": "MATH-8-CH02-S01",
                "skill_name": "Solving Linear Equations with Variables on Both Sides",
                "topic_name": "Linear Equations",
                "difficulty": 3,
                "p_mastery": 0.95,
                "state": "mastered",
                "attempts_count": 38,
            },
            {
                "skill_id": "sk-02",
                "skill_code": "MATH-8-CH11-S02",
                "skill_name": "Surface Area & Volume of Cylinders",
                "topic_name": "Mensuration",
                "difficulty": 4,
                "p_mastery": 0.38,
                "state": "not_learned",
                "attempts_count": 22,
            },
        ],
        "error_patterns": [
            {
                "question_code": "ERR-SIGN-DISTRIB",
                "prompt_excerpt": "Simplify -3(2x - 5) + 4x",
                "distractor_chosen": "-6x - 15 + 4x",
                "count": 7,
                "misconception": "Distributive negative sign error: missed -3 * -5 = +15.",
                "remedy": "Assigned 2-step color-coded bracket expansion module.",
            }
        ],
        "hint_usage": {
            "total_hints": 102,
            "hint_1": 62,
            "hint_2": 28,
            "hint_3": 12,
            "independent": 240,
            "independence_ratio": 70.2,
        },
        "summary": {"mastered_count": 3, "total_skills": 6},
    },
    {
        "id": "stu-002",
        "slug": "stu-priya-patel",
        "full_name": "Priya Patel",
        "full_name_hi": "प्रिया पटेल",
        "roll_number": "102",
        "grade": 8,
        "section": "A",
        "school_name": "Govt. Model Senior Secondary School, Delhi",
        "overall_mastery": 85,
        "learning_streak_days": 22,
        "accuracy_rate": 89,
        "total_questions_solved": 418,
        "practice_hours": 34.0,
        "assigned_teacher_name": "Mr. Rajesh Kumar",
        "skills": [
            {
                "skill_id": "sk-03",
                "skill_code": "MATH-8-CH11-S01",
                "skill_name": "Area of Trapezium & General Quadrilaterals",
                "topic_name": "Mensuration",
                "difficulty": 3,
                "p_mastery": 0.96,
                "state": "mastered",
                "attempts_count": 45,
            },
            {
                "skill_id": "sk-04",
                "skill_code": "MATH-8-CH12-S01",
                "skill_name": "Negative Exponents & Fractional Indices",
                "topic_name": "Exponents and Powers",
                "difficulty": 4,
                "p_mastery": 0.42,
                "state": "not_learned",
                "attempts_count": 20,
            },
        ],
        "error_patterns": [
            {
                "question_code": "ERR-EXP-ADD-BASES",
                "prompt_excerpt": "Simplify 3^4 * 3^2",
                "distractor_chosen": "Multiplied bases to 9^6 instead of 3^6",
                "count": 5,
                "misconception": "Multiplied base values instead of applying power sum rule.",
                "remedy": "Base preservation exercises assigned.",
            }
        ],
        "hint_usage": {
            "total_hints": 98,
            "hint_1": 58,
            "hint_2": 30,
            "hint_3": 10,
            "independent": 320,
            "independence_ratio": 76.5,
        },
        "summary": {"mastered_count": 4, "total_skills": 6},
    },
]

TEACHERS_DB: list[dict[str, Any]] = [
    {
        "id": "tchr-001",
        "slug": "tchr-rajesh-kumar",
        "full_name": "Mr. Rajesh Kumar",
        "full_name_hi": "श्री राजेश कुमार",
        "title": "Senior Mathematics Educator & Department Head",
        "employee_id": "EMP-T8402",
        "school_name": "Govt. Model Senior Secondary School, Delhi",
        "department": "Secondary Mathematics (Classes 8–10)",
        "experience_years": 14,
        "total_students": 125,
        "active_classes": 3,
        "avg_mastery": 78.2,
    },
    {
        "id": "tchr-002",
        "slug": "tchr-sunita-sharma",
        "full_name": "Mrs. Sunita Sharma",
        "full_name_hi": "श्रीमती सुनीता शर्मा",
        "title": "Senior Middle School Mentor & State Awardee",
        "employee_id": "EMP-T7915",
        "school_name": "Govt. Model Senior Secondary School, Delhi",
        "department": "Middle School Mathematics & Science",
        "experience_years": 16,
        "total_students": 76,
        "active_classes": 2,
        "avg_mastery": 78.0,
    },
]


@router.get("/students", response_model=list[dict[str, Any]], summary="List all student profiles")
async def list_student_profiles() -> list[dict[str, Any]]:
    """Retrieve list of distinct student telemetry profiles."""
    return STUDENTS_DB


@router.get("/students/{id_or_slug}", response_model=dict[str, Any], summary="Get distinct student profile")
async def get_student_profile(id_or_slug: str) -> dict[str, Any]:
    """Retrieve individual student profile with distinct mastery, error patterns, and hint usage."""
    query = id_or_slug.lower().strip()
    for s in STUDENTS_DB:
        if s["id"].lower() == query or s["slug"].lower() == query:
            return s
    # Default to first student if demo query
    if STUDENTS_DB:
        return STUDENTS_DB[0]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")


@router.get("/teachers", response_model=list[dict[str, Any]], summary="List all teacher profiles")
async def list_teacher_profiles() -> list[dict[str, Any]]:
    """Retrieve list of distinct educator profiles."""
    return TEACHERS_DB


@router.get("/teachers/{id_or_slug}", response_model=dict[str, Any], summary="Get teacher profile")
async def get_teacher_profile(id_or_slug: str) -> dict[str, Any]:
    """Retrieve individual teacher profile with managed classes and schedule."""
    query = id_or_slug.lower().strip()
    for t in TEACHERS_DB:
        if t["id"].lower() == query or t["slug"].lower() == query:
            return t
    if TEACHERS_DB:
        return TEACHERS_DB[0]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
