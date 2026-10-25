"""Database seeding script with synthetic NCERT curriculum and calibrated questions."""

import asyncio
import sys
import uuid
from pathlib import Path

# Ensure apps/api root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import structlog

from app.db.session import get_session_factory
from app.models.assessment import Question, QuestionTranslation
from app.models.auth import Role, User
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic
from app.models.organization import School, SchoolClass

logger = structlog.get_logger(__name__)


async def seed_data() -> None:
    """Seed synthetic educational data adhering strictly to official NCERT standards."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        logger.info("Beginning database seeding with synthetic NCERT content")

        # 1. Default Roles
        student_role = Role(
            id=uuid.UUID("00000000-0000-0000-0001-000000000001"),
            name="student",
            description="Enrolled student learner",
            permissions=["practice:read", "practice:submit", "mastery:read"],
        )
        session.add(student_role)
        await session.flush()

        # 2. Demo Synthetic Student
        demo_student = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            email="demo.student@bodhai.internal",
            phone="+919876543210",
            full_name="Aarav Sharma",
            role_id=student_role.id,
            preferred_language="en",
            is_active=True,
            is_verified=True,
        )
        session.add(demo_student)

        # 3. Demo School & Class
        demo_school = School(
            id=uuid.uuid4(),
            code="07010100101",  # Synthetic valid 11-digit UDISE+ code format
            name="Govt. Model Senior Secondary School",
            state="Delhi",
            district="Central Delhi",
            block="Karol Bagh",
            pincode="110005",
        )
        session.add(demo_school)
        await session.flush()

        demo_class = SchoolClass(
            id=uuid.uuid4(),
            school_id=demo_school.id,
            grade=6,
            section="A",
            academic_year="2024-2025",
        )
        session.add(demo_class)

        # 4. NCERT Class 6 Mathematics Curriculum
        curriculum = Curriculum(
            id=uuid.uuid4(),
            code="NCERT-MATH-CLASS-6",
            board="NCERT",
            grade=6,
            subject="Mathematics",
            version="2024-2025",
        )
        session.add(curriculum)
        await session.flush()

        # Chapter 1: Knowing Our Numbers
        topic = Topic(
            id=uuid.uuid4(),
            curriculum_id=curriculum.id,
            code="MATH-6-CH01",
            name="Knowing Our Numbers",
            description="Comparing numbers, place value system, estimation, and brackets.",
            sequence_order=1,
        )
        session.add(topic)
        await session.flush()

        # Skills & Directed Prerequisite DAG
        skill_place_val = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000001"),
            topic_id=topic.id,
            code="SKILL-M6-PLACE-VAL",
            name="Place Value in Indian and International Systems",
            description="Reading and writing numbers up to 8 digits using commas and periods.",
            difficulty=0.35,
            blooms_level="understand",
        )
        skill_estimation = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000002"),
            topic_id=topic.id,
            code="SKILL-M6-ESTIMATION",
            name="Estimation and Rounding Off",
            description="Rounding numbers to nearest tens, hundreds, and thousands.",
            difficulty=0.55,
            blooms_level="apply",
        )
        skill_brackets = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000003"),
            topic_id=topic.id,
            code="SKILL-M6-BRACKETS",
            name="Use of Brackets in Arithmetic Expressions",
            description="Simplifying expressions using parentheses and order of operations.",
            difficulty=0.65,
            blooms_level="apply",
        )
        session.add_all([skill_place_val, skill_estimation, skill_brackets])
        await session.flush()

        # Graph Edges: Place Value -> Estimation -> Brackets
        edge1 = Prerequisite(
            parent_skill_id=skill_place_val.id,
            child_skill_id=skill_estimation.id,
            relation_type="hard",
        )
        edge2 = Prerequisite(
            parent_skill_id=skill_estimation.id,
            child_skill_id=skill_brackets.id,
            relation_type="hard",
        )
        session.add_all([edge1, edge2])

        # 5. Calibrated Practice Question 1 (Bilingual)
        q1 = Question(
            id=uuid.UUID("20000000-0000-0000-0000-000000000001"),
            skill_id=skill_place_val.id,
            difficulty=0.40,
            question_type="mcq",
            default_language="en",
        )
        session.add(q1)
        await session.flush()

        # English Translation
        q1_en = QuestionTranslation(
            question_id=q1.id,
            language="en",
            prompt=(
                "What is the place value of digit 7 in the numeral 4,72,518 in the Indian "
                "numbering system?"
            ),
            options=[
                {"id": "A", "text": "700", "is_correct": False},
                {"id": "B", "text": "7,000", "is_correct": False},
                {"id": "C", "text": "70,000", "is_correct": True},
                {"id": "D", "text": "7,00,000", "is_correct": False},
            ],
            explanation=(
                "In 4,72,518: 8 is at Ones, 1 is at Tens, 5 is at Hundreds, 2 is at Thousands, "
                "and 7 is at Ten Thousands. Place value = 7 * 10,000 = 70,000."
            ),
            hints=[
                (
                    "Recall the Indian place value chart: Ones, Tens, Hundreds, Thousands, "
                    "Ten Thousands, Lakhs."
                ),
                "Count positions from the right: 8(1), 1(10), 5(100), 2(1000), 7(10000).",
            ],
        )

        # Hindi Translation
        q1_hi = QuestionTranslation(
            question_id=q1.id,
            language="hi",
            prompt="भारतीय संख्या पद्धति के अनुसार संख्या 4,72,518 में अंक 7 का स्थानीय मान क्या है?",
            options=[
                {"id": "A", "text": "700", "is_correct": False},
                {"id": "B", "text": "7,000", "is_correct": False},
                {"id": "C", "text": "70,000", "is_correct": True},
                {"id": "D", "text": "7,00,000", "is_correct": False},
            ],
            explanation=(
                "संख्या 4,72,518 में: 8 इकाई, 1 दहाई, 5 सैकड़ा, 2 हज़ार, और 7 दस हज़ार के स्थान पर है। "
                "अतः 7 का स्थानीय मान = 7 * 10,000 = 70,000 है।"
            ),
            hints=[
                "भारतीय स्थान मान सारणी को याद करें: इकाई, दहाई, सैकड़ा, हज़ार, दस हज़ार, लाख।",
                "दाएँ से बाईं ओर गिनें: 8(इकाई), 1(दहाई), 5(सैकड़ा), 2(हज़ार), 7(दस हज़ार)।",
            ],
        )
        session.add_all([q1_en, q1_hi])

        await session.commit()
        logger.info("Database seeding successfully completed with NCERT synthetic data")


if __name__ == "__main__":
    try:
        asyncio.run(seed_data())
    except Exception as exc:
        logger.error("Seeding failed", error=str(exc))
        sys.exit(1)
