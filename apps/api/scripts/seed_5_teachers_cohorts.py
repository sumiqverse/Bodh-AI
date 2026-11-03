"""Seed 5 authentic NCERT teacher accounts across different subjects and classes,
each with 40-60 real students having distinct diagnostic progress and telemetry.
"""

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
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.organization import Enrollment, School, SchoolClass
from app.models.teacher import Assignment, AssignmentStudent, TeacherDecision

# Pools of authentic Indian student names
FIRST_NAMES = [
    "Aarav",
    "Diya",
    "Vivaan",
    "Ananya",
    "Kabir",
    "Meera",
    "Arjun",
    "Sneha",
    "Devendra",
    "Pooja",
    "Rohan",
    "Priya",
    "Vikram",
    "Divya",
    "Tanvi",
    "Aditya",
    "Ishaan",
    "Anika",
    "Pranav",
    "Riya",
    "Aryan",
    "Shreya",
    "Siddharth",
    "Avani",
    "Yash",
    "Neha",
    "Varun",
    "Natasha",
    "Nikhil",
    "Shweta",
    "Ayush",
    "Ritu",
    "Ritik",
    "Mansi",
    "Harsh",
    "Pragya",
    "Kunal",
    "Sanya",
    "Tarun",
    "Drishti",
    "Gaurav",
    "Isha",
    "Saurabh",
    "Lavanya",
    "Mayank",
    "Kritika",
    "Shivam",
    "Aditi",
    "Abhishek",
    "Bhavya",
    "Tushar",
    "Charu",
    "Deepak",
    "Garima",
    "Alok",
    "Pallavi",
    "Kartik",
    "Simran",
    "Naveen",
    "Swati",
    "Mohit",
    "Kavya",
    "Rahul",
    "Akanksha",
    "Aakash",
    "Deepika",
    "Manish",
    "Sonali",
    "Vishal",
    "Komal",
    "Anurag",
    "Poonam",
    "Chirag",
    "Bhumika",
    "Hemant",
    "Rashmi",
    "Taruna",
    "Rupesh",
    "Kajal",
    "Sunil",
]

LAST_NAMES = [
    "Sharma",
    "Verma",
    "Gupta",
    "Patel",
    "Sen",
    "Joshi",
    "Kumar",
    "Nair",
    "Singh",
    "Reddy",
    "Malhotra",
    "Mehta",
    "Rao",
    "Kaur",
    "Iyer",
    "Mukherjee",
    "Kulkarni",
    "Mishra",
    "Choudhury",
    "Jain",
    "Pillai",
    "Banerjee",
    "Bhattacharya",
    "Agarwal",
    "Das",
    "Ghosh",
    "Pandey",
    "Tiwari",
    "Yadav",
    "Saxena",
    "Chauhan",
    "Deshmukh",
    "Nambiar",
    "Menon",
    "Bose",
    "Dutta",
    "Sengupta",
    "Chatterjee",
    "Prasad",
    "Sinha",
    "Shukla",
    "Goyal",
    "Bhardwaj",
    "Aggarwal",
    "Thakur",
    "Rathore",
]

# 5 Teachers configuration covering different grades & subjects
TEACHER_CONFIGS = [
    {
        "email": "sunita.sharma@delhiedu.gov.in",
        "name": "Mrs. Sunita Sharma",
        "title": "Middle School Mathematics Specialist",
        "experience": 16,
        "school_dept": "Secondary Mathematics",
        "bio": (
            "State Teacher Awardee specializing in Class 8 conceptual arithmetic, "
            "algebra, and spatial geometry."
        ),
        "gradient": "from-purple-600 via-pink-600 to-rose-700",
        "class_name": "Class 8-A Mathematics",
        "grade": 8,
        "section": "A",
        "join_code": "MATH8A",
        "subject": "mathematics",
        "curriculum_code": "NCERT-MATH-C8",
        "student_count": 48,
        "roll_prefix": 800,
    },
    {
        "email": "rajesh.kumar@delhiedu.gov.in",
        "name": "Mr. Rajesh Kumar",
        "title": "Secondary Science Educator",
        "experience": 14,
        "school_dept": "Secondary Science",
        "bio": (
            "CBSE science mentor passionate about hands-on physics, cellular "
            "biology, and inquiry-based learning."
        ),
        "gradient": "from-blue-600 via-indigo-600 to-cyan-700",
        "class_name": "Class 9-B Science",
        "grade": 9,
        "section": "B",
        "join_code": "SCIE9B",
        "subject": "science",
        "curriculum_code": "NCERT-SCIE-C9",
        "student_count": 52,
        "roll_prefix": 900,
    },
    {
        "email": "ananya.roy@delhiedu.gov.in",
        "name": "Dr. Ananya Roy",
        "title": "High School Mathematics Faculty",
        "experience": 12,
        "school_dept": "Senior Secondary Mathematics",
        "bio": (
            "Doctorate in Mathematics Education, guiding Class 10 board aspirants "
            "in trigonometry and statistics."
        ),
        "gradient": "from-emerald-600 via-teal-600 to-cyan-700",
        "class_name": "Class 10-A Mathematics",
        "grade": 10,
        "section": "A",
        "join_code": "MATH10",
        "subject": "mathematics",
        "curriculum_code": "NCERT-MATH-C10",
        "student_count": 55,
        "roll_prefix": 1000,
    },
    {
        "email": "vikram.sen@delhiedu.gov.in",
        "name": "Mr. Vikram Sen",
        "title": "Social Sciences Faculty",
        "experience": 9,
        "school_dept": "Secondary Social Sciences",
        "bio": (
            "NCERT history, civics, and geography educator inspiring democratic "
            "literacy and environmental awareness."
        ),
        "gradient": "from-amber-600 via-orange-600 to-red-700",
        "class_name": "Class 7-C Social Science",
        "grade": 7,
        "section": "C",
        "join_code": "SOCI7C",
        "subject": "social_science",
        "curriculum_code": "NCERT-SOCI-C7",
        "student_count": 44,
        "roll_prefix": 700,
    },
    {
        "email": "kavita.deshmukh@delhiedu.gov.in",
        "name": "Ms. Kavita Deshmukh",
        "title": "Middle School English Educator",
        "experience": 10,
        "school_dept": "Department of English Literature",
        "bio": (
            "Class 6 English educator emphasizing reading comprehension, "
            "communicative fluency, and creative writing."
        ),
        "gradient": "from-fuchsia-600 via-pink-600 to-purple-800",
        "class_name": "Class 6-A English",
        "grade": 6,
        "section": "A",
        "join_code": "ENGL6A",
        "subject": "english",
        "curriculum_code": "NCERT-ENGL-C6",
        "student_count": 46,
        "roll_prefix": 600,
    },
]


async def seed_cohorts() -> None:
    print("--> Connecting to PostgreSQL...")
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        # 1. Fetch Roles
        roles = (await session.execute(select(Role))).scalars().all()
        student_role = next((r for r in roles if r.name == "student"), None)
        teacher_role = next((r for r in roles if r.name == "teacher"), None)
        if not student_role or not teacher_role:
            raise RuntimeError("Required roles ('student' or 'teacher') missing!")

        # 2. Fetch School
        school = (await session.execute(select(School))).scalars().first()
        if not school:
            school = School(
                id=uuid.uuid4(),
                code="SCH_DEFAULT_01",
                name="BodhAI Demonstration Model School",
                state="Delhi",
                district="New Delhi",
                block="Central",
                pincode="110001",
            )
            session.add(school)
            await session.flush()

        now = datetime.now(UTC)

        seed_teacher_password = os.environ.get("BODHAI_SEED_TEACHER_PASSWORD", "")
        if len(seed_teacher_password) < 12:
            raise RuntimeError(
                "Set BODHAI_SEED_TEACHER_PASSWORD to a unique password of at least 12 characters "
                "before seeding teacher accounts."
            )
        seed_student_pin = os.environ.get("BODHAI_SEED_STUDENT_PIN", "")
        if not seed_student_pin.isdigit() or not (6 <= len(seed_student_pin) <= 8):
            raise RuntimeError(
                "Set BODHAI_SEED_STUDENT_PIN to a 6-8 digit PIN before seeding student accounts."
            )

        default_pwd_hash = hash_secret(seed_teacher_password)
        default_pin_hash = hash_secret(seed_student_pin)

        total_students_created = 0
        total_masteries_created = 0
        total_attempts_created = 0

        # Used usernames set to guarantee 100% uniqueness across entire DB
        existing_usernames = set(
            (await session.execute(select(User.username).where(User.username.isnot(None))))
            .scalars()
            .all()
        )

        for t_cfg in TEACHER_CONFIGS:
            print("\n==========================================")
            print(f"--> Setting up Teacher: {t_cfg['name']} ({t_cfg['email']})")
            print(
                f"    Class: {t_cfg['class_name']} [{t_cfg['join_code']}] | "
                f"Students: {t_cfg['student_count']}"
            )

            # A. Create or update Teacher user
            teacher = (
                await session.execute(select(User).where(User.email == t_cfg["email"]))
            ).scalar_one_or_none()

            teacher_profile_data = {
                "fullName": t_cfg["name"],
                "title": t_cfg["title"],
                "schoolName": school.name,
                "experienceYears": t_cfg["experience"],
                "department": t_cfg["school_dept"],
                "bio": t_cfg["bio"],
                "avatarGradient": t_cfg["gradient"],
                "officeHours": "Monday - Friday, 2:00 PM - 4:00 PM",
                "specializations": [
                    "CBSE/NCERT Curriculum",
                    f"Grade {t_cfg['grade']} {t_cfg['subject'].title()}",
                ],
            }

            if not teacher:
                teacher = User(
                    id=uuid.uuid4(),
                    email=t_cfg["email"],
                    username=t_cfg["email"].split("@")[0].replace(".", "_"),
                    full_name=t_cfg["name"],
                    hashed_password=default_pwd_hash,
                    role_id=teacher_role.id,
                    is_active=True,
                    is_verified=True,
                    is_minor=False,
                    preferred_language="en",
                    profile_data=teacher_profile_data,
                )
                session.add(teacher)
                await session.flush()
            else:
                teacher.full_name = t_cfg["name"]
                teacher.is_active = True
                teacher.is_verified = True
                teacher.profile_data = teacher_profile_data
                await session.flush()

            # B. Create or update Classroom
            school_class = (
                await session.execute(
                    select(SchoolClass).where(
                        SchoolClass.teacher_id == teacher.id,
                        SchoolClass.join_code == t_cfg["join_code"],
                    )
                )
            ).scalar_one_or_none()

            if not school_class:
                # Also check by join_code alone
                school_class = (
                    await session.execute(
                        select(SchoolClass).where(SchoolClass.join_code == t_cfg["join_code"])
                    )
                ).scalar_one_or_none()

            if not school_class:
                school_class = SchoolClass(
                    id=uuid.uuid4(),
                    name=t_cfg["class_name"],
                    school_id=school.id,
                    teacher_id=teacher.id,
                    grade=t_cfg["grade"],
                    section=t_cfg["section"],
                    academic_year="2024-2025",
                    join_code=t_cfg["join_code"],
                )
                session.add(school_class)
                await session.flush()
            else:
                school_class.name = t_cfg["class_name"]
                school_class.teacher_id = teacher.id
                school_class.grade = t_cfg["grade"]
                school_class.section = t_cfg["section"]
                school_class.is_deleted = False
                await session.flush()

            # C. Fetch Skills for this class's curriculum
            skills_stmt = (
                select(Skill)
                .join(Topic, Skill.topic_id == Topic.id)
                .join(Curriculum, Topic.curriculum_id == Curriculum.id)
                .where(Curriculum.code == t_cfg["curriculum_code"], Skill.is_deleted.is_(False))
                .order_by(Skill.difficulty.asc(), Skill.code.asc())
            )
            skills = (await session.execute(skills_stmt)).scalars().all()
            if not skills:
                # Fallback to any skills for this grade
                skills_stmt = (
                    select(Skill)
                    .join(Topic, Skill.topic_id == Topic.id)
                    .join(Curriculum, Topic.curriculum_id == Curriculum.id)
                    .where(Curriculum.grade == t_cfg["grade"], Skill.is_deleted.is_(False))
                )
                skills = (await session.execute(skills_stmt)).scalars().all()

            # Fetch Questions for this class's curriculum
            q_stmt = (
                select(Question)
                .join(Skill, Question.skill_id == Skill.id)
                .join(Topic, Skill.topic_id == Topic.id)
                .join(Curriculum, Topic.curriculum_id == Curriculum.id)
                .where(Curriculum.grade == t_cfg["grade"])
            )
            class_questions = (await session.execute(q_stmt)).scalars().all()
            print(
                f"    Available Skills: {len(skills)} | Available Questions: {len(class_questions)}"
            )

            # D. Generate 40 to 60 real students
            student_users_for_class: list[User] = []
            target_count = t_cfg["student_count"]

            # Check existing enrollments for this class
            existing_enr_stmt = select(Enrollment).where(Enrollment.class_id == school_class.id)
            existing_enrs = (await session.execute(existing_enr_stmt)).scalars().all()
            existing_student_ids = {e.student_id for e in existing_enrs}

            # Gather existing enrolled users
            if existing_student_ids:
                existing_students = (
                    (await session.execute(select(User).where(User.id.in_(existing_student_ids))))
                    .scalars()
                    .all()
                )
                student_users_for_class.extend(existing_students)

            needed_students = target_count - len(student_users_for_class)

            # Generate unique names and usernames
            for i in range(needed_students):
                fn = FIRST_NAMES[(i + t_cfg["roll_prefix"]) % len(FIRST_NAMES)]
                ln = LAST_NAMES[(i * 3 + t_cfg["roll_prefix"]) % len(LAST_NAMES)]
                full_name = f"{fn} {ln}"
                roll_num = f"{t_cfg['roll_prefix'] + len(student_users_for_class) + 1}"

                base_un = f"{fn.lower()}_{roll_num}"
                un = base_un
                counter = 1
                while un in existing_usernames:
                    un = f"{base_un}_{counter}"
                    counter += 1
                existing_usernames.add(un)

                stu_user = User(
                    id=uuid.uuid4(),
                    username=un,
                    full_name=full_name,
                    pin_hash=default_pin_hash,
                    role_id=student_role.id,
                    is_minor=True,
                    is_active=True,
                    is_verified=True,
                    preferred_language="en" if i % 3 != 0 else "hi",
                    profile_data={
                        "schoolName": school.name,
                        "grade": t_cfg["grade"],
                        "section": t_cfg["section"],
                        "rollNumber": roll_num,
                    },
                )
                session.add(stu_user)
                student_users_for_class.append(stu_user)

            await session.flush()

            # E. Enroll all students in this class
            for idx, stu in enumerate(student_users_for_class):
                roll_str = f"{t_cfg['roll_prefix'] + idx + 1}"
                enr = (
                    await session.execute(
                        select(Enrollment).where(
                            Enrollment.class_id == school_class.id,
                            Enrollment.student_id == stu.id,
                        )
                    )
                ).scalar_one_or_none()

                if not enr:
                    enr = Enrollment(
                        id=uuid.uuid4(),
                        class_id=school_class.id,
                        student_id=stu.id,
                        roll_number=roll_str,
                        status="active",
                    )
                    session.add(enr)
                else:
                    enr.roll_number = roll_str
                    enr.status = "active"

            await session.flush()
            total_students_created += len(student_users_for_class)
            print(
                f"    Roster synchronized: {len(student_users_for_class)} "
                "students actively enrolled."
            )

            # F. Clear and populate distinct Bayesian mastery & attempts for each student
            all_stu_ids = [s.id for s in student_users_for_class]
            await session.execute(delete(Mastery).where(Mastery.student_id.in_(all_stu_ids)))
            await session.execute(delete(Attempt).where(Attempt.student_id.in_(all_stu_ids)))

            class_mastery_list: list[Mastery] = []
            class_attempts_list: list[Attempt] = []

            for s_idx, student in enumerate(student_users_for_class):
                # Assign student performance archetype:
                # 0, 1, 2: High performers (~30%)
                # 3, 4, 5, 6, 7: Average learners (~50%)
                # 8: Struggling learner (~10%)
                # 9: Inactive student (~10%)
                modulo = s_idx % 10
                if modulo in (0, 1, 2):
                    archetype = "high"
                elif modulo in (3, 4, 5, 6):
                    archetype = "average"
                elif modulo in (7, 8):
                    archetype = "struggling"
                else:
                    archetype = "inactive"

                # Seed mastery across all skills of this curriculum
                for sk in skills:
                    diff = sk.difficulty or 0.5

                    if archetype == "high":
                        # Strong mastery across board
                        if diff < 0.6:
                            p = random.uniform(0.85, 0.98)
                            attempts = random.randint(10, 24)
                            correct = int(attempts * random.uniform(0.85, 1.0))
                        else:
                            p = random.uniform(0.68, 0.90)
                            attempts = random.randint(8, 20)
                            correct = int(attempts * random.uniform(0.70, 0.88))
                        last_days = random.randint(1, 3)

                    elif archetype == "average":
                        # Solid basics, partial on harder topics
                        if diff < 0.4:
                            p = random.uniform(0.78, 0.92)
                            attempts = random.randint(8, 16)
                            correct = int(attempts * random.uniform(0.80, 0.94))
                        elif diff < 0.7:
                            p = random.uniform(0.45, 0.72)
                            attempts = random.randint(6, 18)
                            correct = int(attempts * random.uniform(0.50, 0.75))
                        else:
                            p = random.uniform(0.18, 0.48)
                            attempts = random.randint(4, 12)
                            correct = int(attempts * random.uniform(0.25, 0.50))
                        last_days = random.randint(1, 5)

                    elif archetype == "struggling":
                        # Significant learning gaps, needs remediation
                        if diff < 0.35:
                            p = random.uniform(0.52, 0.75)
                            attempts = random.randint(6, 14)
                            correct = int(attempts * random.uniform(0.55, 0.75))
                        else:
                            p = random.uniform(0.12, 0.38)
                            attempts = random.randint(8, 20)
                            correct = int(attempts * random.uniform(0.20, 0.40))
                        last_days = random.randint(1, 6)

                    else:  # inactive
                        # Sporadic attempts, hasn't practiced in 16-24 days (Early Warning!)
                        p = random.uniform(0.25, 0.55)
                        attempts = random.randint(3, 8)
                        correct = int(attempts * 0.4)
                        last_days = random.randint(16, 25)

                    conf = min(0.99, max(0.40, 0.30 + (attempts * 0.04)))
                    last_time = now - timedelta(days=last_days, hours=random.randint(1, 14))

                    class_mastery_list.append(
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

                # Generate 5 to 15 real practice attempts per student
                sample_qs = (
                    random.sample(class_questions, min(len(class_questions), random.randint(6, 14)))
                    if class_questions
                    else []
                )
                for q in sample_qs:
                    is_corr = (
                        (archetype == "high" and random.random() > 0.15)
                        or (archetype == "average" and random.random() > 0.40)
                        or (archetype == "struggling" and random.random() > 0.70)
                        or (random.random() > 0.50)
                    )
                    time_s = random.randint(15, 60)
                    days_ago = (
                        random.randint(16, 25) if archetype == "inactive" else random.randint(1, 8)
                    )

                    class_attempts_list.append(
                        Attempt(
                            id=uuid.uuid4(),
                            student_id=student.id,
                            question_id=q.id,
                            skill_id=q.skill_id,
                            idempotency_key=f"att-{uuid.uuid4().hex[:24]}",
                            selected_answer="A" if is_corr else "B",
                            is_correct=is_corr,
                            time_spent_ms=time_s * 1000,
                            client_timestamp=now
                            - timedelta(days=days_ago, minutes=random.randint(5, 500)),
                        )
                    )

            session.add_all(class_mastery_list)
            session.add_all(class_attempts_list)
            total_masteries_created += len(class_mastery_list)
            total_attempts_created += len(class_attempts_list)
            print(
                f"    Telemetry seeded: {len(class_mastery_list)} masteries & "
                f"{len(class_attempts_list)} practice attempts."
            )

            # G. Seed Class Assignments
            asgn1_id = uuid.uuid4()
            asgn2_id = uuid.uuid4()
            skill_sample_ids = [str(sk.id) for sk in skills[: min(5, len(skills))]]

            asgn1 = Assignment(
                id=asgn1_id,
                class_id=school_class.id,
                teacher_id=teacher.id,
                title=f"{t_cfg['subject'].title()} Diagnostic Review & Foundations",
                description="Comprehensive prerequisite check covering core NCERT competencies.",
                skill_ids=skill_sample_ids,
                due_date=now + timedelta(days=5),
                status="active",
            )
            asgn2 = Assignment(
                id=asgn2_id,
                class_id=school_class.id,
                teacher_id=teacher.id,
                title=f"Scaffolded Competency Drill - Week {random.randint(1, 4)}",
                description="Targeted 3-level hints practice problem set.",
                skill_ids=skill_sample_ids,
                due_date=now + timedelta(days=12),
                status="active",
            )
            session.add(asgn1)
            session.add(asgn2)

            for idx, student in enumerate(student_users_for_class):
                session.add(
                    AssignmentStudent(
                        id=uuid.uuid4(),
                        assignment_id=asgn1_id,
                        student_id=student.id,
                        status="completed"
                        if idx % 3 == 0
                        else ("submitted" if idx % 3 == 1 else "assigned"),
                        completed_at=now - timedelta(days=1) if idx % 3 == 0 else None,
                    )
                )

            # H. Seed Teacher Pedagogical Decisions
            for dec_idx, act in enumerate(["accepted", "accepted", "overridden"]):
                session.add(
                    TeacherDecision(
                        id=uuid.uuid4(),
                        class_id=school_class.id,
                        teacher_id=teacher.id,
                        suggestion_id=f"gap-cluster-{t_cfg['grade']}-{dec_idx + 1}",
                        action=act,
                        evidence={
                            "students_affected": random.randint(8, 16),
                            "average_confidence": round(random.uniform(0.72, 0.91), 2),
                            "curriculum": t_cfg["curriculum_code"],
                        },
                        rationale=(
                            f"Addressed whole-class prerequisite gap in {t_cfg['subject']} "
                            "before advancing chapter."
                        ),
                        teacher_notes="Formed 4-student peer study cohorts for practice.",
                    )
                )

        await session.commit()
        print("\n==========================================")
        print("--> ALL 5 TEACHERS & COHORTS SEEDED SUCCESSFULLY!")
        print(f"    Total Students in Database: {total_students_created}")
        print(f"    Total Bayesian Masteries: {total_masteries_created}")
        print(f"    Total Practice Attempts: {total_attempts_created}")
        print("==========================================")


if __name__ == "__main__":
    asyncio.run(seed_cohorts())
