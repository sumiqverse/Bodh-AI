import copy
import uuid
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.content_importer import ContentImporter, validate_content_pack


@pytest.fixture
def sample_pack() -> dict[str, Any]:
    """Well-formed sample pack with curriculum, topics, skills, questions, and glossary."""
    uid = uuid.uuid4().hex[:8]
    return {
        "curriculum": {
            "code": f"NCERT-MATH-{uid}",
            "board": "NCERT",
            "grade": 8,
            "subject": "mathematics",
            "version": "2024.1",
        },
        "topics": [
            {
                "code": f"TOPIC-RAT-{uid}",
                "name": "Rational Numbers",
                "description": "Properties and operations",
                "sequence_order": 1,
            }
        ],
        "skills": [
            {
                "code": f"SKILL-RAT-01-{uid}",
                "topic_code": f"TOPIC-RAT-{uid}",
                "name": "Closure Property",
                "description": "Understand closure of rational numbers",
                "difficulty": 0.4,
                "blooms_level": "understand",
                "prerequisites": [],
            },
            {
                "code": f"SKILL-RAT-02-{uid}",
                "topic_code": f"TOPIC-RAT-{uid}",
                "name": "Commutative Property",
                "description": "Understand commutativity",
                "difficulty": 0.5,
                "blooms_level": "apply",
                "prerequisites": [{"skill_code": f"SKILL-RAT-01-{uid}", "relation_type": "hard"}],
            },
        ],
        "glossary": [
            {
                "term_en": f"Rational Number {uid}",
                "term_hi": "परिमेय संख्या",
                "definition_en": "A number in the form p/q with non-zero q.",
                "definition_hi": "p/q रूप की संख्या जहाँ q शून्य न हो।",
                "category": "number_systems",
            }
        ],
        "questions": [
            {
                "code": f"Q-RAT-001-{uid}",
                "skill_code": f"SKILL-RAT-01-{uid}",
                "question_type": "mcq",
                "difficulty": 2,
                "status": "draft",
                "needs_teacher_review": True,
                "translations": [
                    {
                        "language": "en",
                        "prompt": "Which operation is NOT closed for rational numbers?",
                        "options": [
                            {"id": "A", "text": "Addition", "is_correct": False},
                            {"id": "B", "text": "Subtraction", "is_correct": False},
                            {"id": "C", "text": "Multiplication", "is_correct": False},
                            {"id": "D", "text": "Division (by zero)", "is_correct": True},
                        ],
                        "verified_answer": "D",
                        "worked_solution": (
                            "Division by zero is undefined, so rationals "
                            "are not closed under division."
                        ),
                        "explanation": "Division by zero produces an undefined outcome.",
                        "hints": [
                            "Consider dividing by zero.",
                            "Is 1/0 a valid rational number?",
                            "Select option D.",
                        ],
                    },
                    {
                        "language": "hi",
                        "prompt": "परिमेय संख्याओं के लिए कौन सी संक्रिया संवृत नहीं है?",
                        "options": [
                            {"id": "A", "text": "योग", "is_correct": False},
                            {"id": "B", "text": "व्यवकलन", "is_correct": False},
                            {"id": "C", "text": "गुणन", "is_correct": False},
                            {"id": "D", "text": "विभाजन (शून्य द्वारा)", "is_correct": True},
                        ],
                        "verified_answer": "D",
                        "worked_solution": "शून्य से विभाजन अपरिभाषित है।",
                        "explanation": "शून्य से विभाजन संभव नहीं है।",
                        "hints": [
                            "शून्य द्वारा विभाजन पर विचार करें।",
                            "क्या 1/0 एक परिमेय संख्या है?",
                            "विकल्प D चुनें।",
                        ],
                    },
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_importer_idempotency(db_session: AsyncSession, sample_pack: dict[str, Any]) -> None:
    """Importing the same pack twice must produce 0 mutations on the second execution."""
    importer = ContentImporter(db_session)

    # First import
    diff1 = await importer.import_pack(sample_pack, dry_run=False)
    assert diff1.curriculum_created == 1
    assert diff1.topics_created == 1
    assert diff1.skills_created == 2
    assert diff1.prerequisites_created == 1
    assert diff1.glossary_created == 1
    assert diff1.questions_created == 1
    assert diff1.total_mutations > 0

    # Second import with identical data
    diff2 = await importer.import_pack(sample_pack, dry_run=False)
    assert diff2.curriculum_created == 0
    assert diff2.curriculum_updated == 0
    assert diff2.topics_created == 0
    assert diff2.topics_updated == 0
    assert diff2.skills_created == 0
    assert diff2.skills_updated == 0
    assert diff2.prerequisites_created == 0
    assert diff2.prerequisites_updated == 0
    assert diff2.questions_created == 0
    assert diff2.questions_updated == 0
    assert diff2.glossary_created == 0
    assert diff2.glossary_updated == 0
    assert diff2.total_mutations == 0


@pytest.mark.asyncio
async def test_importer_dry_run_does_not_persist(
    db_session: AsyncSession, sample_pack: dict[str, Any]
) -> None:
    """Dry run computes mutations but rolls back database transactions."""
    importer = ContentImporter(db_session)
    diff = await importer.import_pack(sample_pack, dry_run=True)
    assert diff.curriculum_created == 1
    assert diff.total_mutations > 0

    # Ensure second dry run still reports created (not persisted in DB)
    diff2 = await importer.import_pack(sample_pack, dry_run=True)
    assert diff2.curriculum_created == 1


def test_schema_rejection_invalid_grade(sample_pack: dict[str, Any]) -> None:
    """Curriculum grade must be between 6 and 10."""
    bad_pack = copy.deepcopy(sample_pack)
    bad_pack["curriculum"]["grade"] = 4  # Class 4 is out of scope
    res = validate_content_pack(bad_pack)
    assert res.is_valid is False
    assert any("curriculum.grade" in err for err in res.errors)


def test_schema_rejection_missing_hints(sample_pack: dict[str, Any]) -> None:
    """Questions must have exactly 3 progressive scaffolding hints."""
    bad_pack = copy.deepcopy(sample_pack)
    bad_pack["questions"][0]["translations"][0]["hints"] = ["Only one hint"]
    res = validate_content_pack(bad_pack)
    assert res.is_valid is False
    assert any("hints" in err for err in res.errors)


def test_schema_rejection_mcq_verified_answer_mismatch(sample_pack: dict[str, Any]) -> None:
    """MCQ verified_answer must match the option id that has is_correct = True."""
    bad_pack = copy.deepcopy(sample_pack)
    # verified answer says A, but option D is correct
    bad_pack["questions"][0]["translations"][0]["verified_answer"] = "A"
    res = validate_content_pack(bad_pack)
    assert res.is_valid is False
    assert any("does not match correct option" in err for err in res.errors)


def test_schema_rejection_mcq_multiple_correct(sample_pack: dict[str, Any]) -> None:
    """MCQ must have exactly 1 correct option."""
    bad_pack = copy.deepcopy(sample_pack)
    opts = bad_pack["questions"][0]["translations"][0]["options"]
    opts[0]["is_correct"] = True  # Now both A and D are marked correct
    res = validate_content_pack(bad_pack)
    assert res.is_valid is False
    assert any("must have exactly 1 correct option" in err for err in res.errors)


@pytest.mark.asyncio
async def test_importer_updates_existing_records(
    db_session: AsyncSession, sample_pack: dict[str, Any]
) -> None:
    """Importing modified pack data updates existing rows instead of inserting duplicates."""
    importer = ContentImporter(db_session)

    # First import
    diff1 = await importer.import_pack(sample_pack, dry_run=False)
    assert diff1.curriculum_created == 1
    assert diff1.questions_created == 1

    # Modify existing records
    updated_pack = copy.deepcopy(sample_pack)
    updated_pack["curriculum"]["version"] = "2024.2"
    updated_pack["topics"][0]["name"] = "Rational Numbers (Revised)"
    updated_pack["skills"][0]["description"] = "Revised skill description"
    updated_pack["skills"][1]["difficulty"] = 0.9
    updated_pack["glossary"][0]["definition_en"] = "Revised glossary definition in English."
    updated_pack["questions"][0]["difficulty"] = 3
    updated_pack["questions"][0]["translations"][0]["prompt"] = (
        "Revised prompt: Which operation is NOT closed?"
    )

    diff2 = await importer.import_pack(updated_pack, dry_run=False)
    assert diff2.curriculum_updated == 1
    assert diff2.topics_updated == 1
    assert diff2.skills_updated >= 1
    assert diff2.glossary_updated == 1
    assert diff2.questions_updated == 1
    assert diff2.total_mutations > 0
