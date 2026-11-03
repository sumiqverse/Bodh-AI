"""Seed authentic NCERT student cohort, enrollments, mastery, and attempts in PostgreSQL."""

import asyncio
import os
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure apps/api root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select

from app.core.security import hash_secret
from app.db.base import Base
from app.db.session import get_engine, get_session_factory
from app.models.assessment import Attempt, Mastery, Question
from app.models.auth import Role, User
from app.models.curriculum import Curriculum, Skill
from app.models.organization import Enrollment, SchoolClass
from app.models.teacher import Assignment, AssignmentStudent

STUDENT_COHORT = [
    {"name": "Aarav Sharma", "username": "aarav_sharma", "roll": "101", "archetype": "high"},
    {"name": "Priya Patel", "username": "priya_patel", "roll": "102", "archetype": "high"},
    {"name": "Rohan Verma", "username": "rohan_verma", "roll": "103", "archetype": "mid"},
    {"name": "Ananya Sen", "username": "ananya_sen", "roll": "104", "archetype": "high"},
    {"name": "Kabir Das", "username": "kabir_das", "roll": "105", "archetype": "mid"},
    {"name": "Meera Joshi", "username": "meera_joshi", "roll": "106", "archetype": "mid"},
    {"name": "Vikram Malhotra", "username": "vikram_m", "roll": "107", "archetype": "inactive"},
    {"name": "Sneha Reddy", "username": "sneha_reddy", "roll": "108", "archetype": "struggling"},
    {"name": "Devendra Singh", "username": "dev_singh", "roll": "109", "archetype": "mid"},
    {"name": "Pooja Nair", "username": "pooja_nair", "roll": "110", "archetype": "struggling"},
    {"name": "Arjun Mehta", "username": "arjun_m", "roll": "111", "archetype": "mid"},
    {"name": "Divya Rao", "username": "divya_rao", "roll": "112", "archetype": "high"},
    {"name": "Rohit Kumar", "username": "rohit_k", "roll": "113", "archetype": "struggling"},
    {"name": "Simran Kaur", "username": "simran_k", "roll": "114", "archetype": "mid"},
    {"name": "Aman Gupta", "username": "aman_g", "roll": "115", "archetype": "mid"},
]


async def seed_real_students() -> None:
    print("--> Ensuring database tables exist...")
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        print("--> Fetching roles and curriculum...")
        roles = (await session.execute(select(Role))).scalars().all()
        student_role = next((r for r in roles if r.name == "student"), None)
        if not student_role:
            raise RuntimeError("Student role not found in database!")

        # 1. Fetch Grade 8 Curriculum & Skills
        skills = (
            (
                await session.execute(
                    select(Skill)
                    .join(Curriculum, Skill.topic_id == Skill.topic_id)
                    .where(Skill.is_deleted == False)  # noqa: E712
                    .order_by(Skill.difficulty.asc(), Skill.code.asc())
                )
            )
            .scalars()
            .all()
        )
        print(f"--> Found {len(skills)} skills in curriculum.")

        # 2. Fetch existing classes and teachers
        classes = (await session.execute(select(SchoolClass))).scalars().all()
        if not classes:
            raise RuntimeError("No school classes found in database!")

        # Make sure at least one class has Grade 8 & join_code MATH8A for easy student join
        class_8 = next((c for c in classes if c.grade == 8), classes[0])
        class_8.name = "Class 8-A Mathematics"
        class_8.grade = 8
        class_8.join_code = "MATH8A"

        # Also check other classes
        for c in classes:
            if c.id != class_8.id and c.grade == 8:
                c.name = "Class 8-B Mathematics"
                c.join_code = "MATH8B"

        await session.flush()
        target_classes = classes
        print(f"--> Target classes: {[(c.name, c.join_code) for c in target_classes]}")

        # 3. Create or update 15 real student user records
        seed_student_pin = os.environ.get("BODHAI_SEED_STUDENT_PIN", "")
        if not seed_student_pin.isdigit() or not (6 <= len(seed_student_pin) <= 8):
            raise RuntimeError(
                "Set BODHAI_SEED_STUDENT_PIN to a 6-8 digit PIN before seeding student accounts."
            )
        default_pin_hash = hash_secret(seed_student_pin)
        student_users: list[User] = []

        now = datetime.now(UTC)

        for sc in STUDENT_COHORT:
            existing_user = (
                await session.execute(select(User).where(User.username == sc["username"]))
            ).scalar_one_or_none()

            if existing_user:
                existing_user.full_name = sc["name"]
                existing_user.pin_hash = default_pin_hash
                existing_user.is_active = True
                existing_user.is_verified = True
                student_user = existing_user
            else:
                student_user = User(
                    id=uuid.uuid4(),
                    username=sc["username"],
                    full_name=sc["name"],
                    pin_hash=default_pin_hash,
                    role_id=student_role.id,
                    is_minor=True,
                    is_active=True,
                    is_verified=True,
                    preferred_language="en",
                )
                session.add(student_user)

            student_users.append(student_user)

        await session.flush()
        print(f"--> Upserted {len(student_users)} student user accounts.")

        # 4. Enroll students into classes
        for target_class in target_classes:
            for idx, student in enumerate(student_users):
                roll_num = STUDENT_COHORT[idx]["roll"]
                existing_enr = (
                    await session.execute(
                        select(Enrollment).where(
                            Enrollment.class_id == target_class.id,
                            Enrollment.student_id == student.id,
                        )
                    )
                ).scalar_one_or_none()

                if not existing_enr:
                    enr = Enrollment(
                        id=uuid.uuid4(),
                        class_id=target_class.id,
                        student_id=student.id,
                        roll_number=roll_num,
                        status="active",
                    )
                    session.add(enr)
                else:
                    existing_enr.roll_number = roll_num
                    existing_enr.status = "active"

        await session.flush()
        print("--> Enrolled all 15 students into classroom rosters.")

        # 5. Populate Bayesian Mastery table (`mastery`) for all students across skills
        # Delete existing mastery for these students to ensure clean, authentic state
        student_ids = [s.id for s in student_users]
        await session.execute(delete(Mastery).where(Mastery.student_id.in_(student_ids)))

        mastery_entries: list[Mastery] = []

        for idx, student in enumerate(student_users):
            archetype = STUDENT_COHORT[idx]["archetype"]

            for _s_idx, sk in enumerate(skills):
                # Calibrate P(mastery) based on archetype and skill difficulty
                diff = sk.difficulty or 0.5

                if archetype == "high":
                    # High performer: Mostly mastered, a few partial on hard skills
                    if diff < 0.6:
                        p = random.uniform(0.82, 0.98)
                        attempts = random.randint(8, 20)
                        correct = int(attempts * random.uniform(0.85, 1.0))
                    else:
                        p = random.uniform(0.60, 0.88)
                        attempts = random.randint(10, 25)
                        correct = int(attempts * random.uniform(0.70, 0.90))
                    last_days_ago = random.randint(1, 4)

                elif archetype == "mid":
                    # Average student: Solid foundations, struggling with intermediate/advanced
                    if diff < 0.4:
                        p = random.uniform(0.75, 0.92)
                        attempts = random.randint(6, 15)
                        correct = int(attempts * random.uniform(0.80, 0.95))
                    elif diff < 0.7:
                        p = random.uniform(0.40, 0.70)
                        attempts = random.randint(8, 20)
                        correct = int(attempts * random.uniform(0.50, 0.75))
                    else:
                        p = random.uniform(0.15, 0.45)
                        attempts = random.randint(4, 12)
                        correct = int(attempts * random.uniform(0.20, 0.45))
                    last_days_ago = random.randint(1, 6)

                elif archetype == "inactive":
                    # Inactive student: Has not practiced in 16+ days (Early Warning trigger!)
                    p = random.uniform(0.20, 0.55)
                    attempts = random.randint(3, 8)
                    correct = int(attempts * 0.4)
                    last_days_ago = random.randint(16, 22)

                else:  # struggling
                    # Struggling student: Multiple gaps across core competencies
                    p = random.uniform(0.50, 0.75) if diff < 0.35 else random.uniform(0.12, 0.42)
                    attempts = random.randint(6, 18)
                    correct = int(attempts * random.uniform(0.25, 0.45))
                    last_days_ago = random.randint(2, 9)

                conf = min(0.95, 0.35 + (attempts * 0.05))
                last_time = now - timedelta(days=last_days_ago, hours=random.randint(1, 12))

                mastery_entries.append(
                    Mastery(
                        id=uuid.uuid4(),
                        student_id=student.id,
                        skill_id=sk.id,
                        p_mastery=round(p, 4),
                        confidence=round(conf, 4),
                        attempts_count=attempts,
                        correct_count=correct,
                        last_attempted_at=last_time,
                    )
                )

        session.add_all(mastery_entries)
        print(f"--> Seeded {len(mastery_entries)} Bayesian mastery records in DB.")

        # 6. Seed practice Attempts in PostgreSQL
        questions = (await session.execute(select(Question).limit(60))).scalars().all()
        if questions:
            attempt_entries: list[Attempt] = []
            for student in student_users[:8]:  # seed recent attempts for first 8 students
                for q in questions[:10]:
                    is_corr = random.random() > 0.35
                    attempt_entries.append(
                        Attempt(
                            id=uuid.uuid4(),
                            student_id=student.id,
                            question_id=q.id,
                            skill_id=q.skill_id,
                            idempotency_key=f"seed-{uuid.uuid4().hex}",
                            selected_answer="A" if is_corr else "B",
                            is_correct=is_corr,
                            time_spent_ms=random.randint(12000, 45000),
                            client_timestamp=now - timedelta(days=random.randint(1, 10)),
                        )
                    )
            session.add_all(attempt_entries)
            print(f"--> Seeded {len(attempt_entries)} practice attempts in attempts table.")

        # 7. Seed assignments
        for target_class in target_classes:
            asgn1_id = uuid.uuid4()
            asgn1 = Assignment(
                id=asgn1_id,
                class_id=target_class.id,
                teacher_id=target_class.teacher_id,
                title="Rational Numbers & Operations Revision",
                description=(
                    "Mandatory practice set covering representation, ordering, "
                    "and addition of fractions."
                ),
                skill_ids=[str(sk.id) for sk in skills[:4]],
                due_date=now + timedelta(days=7),
                status="active",
            )
            session.add(asgn1)

            # Assign to all students
            for idx, student in enumerate(student_users):
                session.add(
                    AssignmentStudent(
                        id=uuid.uuid4(),
                        assignment_id=asgn1_id,
                        student_id=student.id,
                        status="completed" if idx < 4 else "assigned",
                        completed_at=(now - timedelta(days=1)) if idx < 4 else None,
                    )
                )

        await session.commit()
        print("--> SUCCESS: Database successfully seeded with 15 real NCERT students & mastery!")


if __name__ == "__main__":
    asyncio.run(seed_real_students())
