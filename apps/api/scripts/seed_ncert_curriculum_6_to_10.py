"""Seed comprehensive NCERT Curriculum for Classes 6 to 10 across Mathematics, Science, Social Science, English, and Hindi into PostgreSQL."""

import asyncio
import sys
import uuid
from pathlib import Path

# Ensure apps/api root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.curriculum_data import NCERT_DATA
from app.core.question_bank import generate_authentic_questions_for_skill
from app.db.base import Base
from app.db.session import get_engine, get_session_factory
from app.models.assessment import Question, QuestionTranslation
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic


async def seed_all_curricula() -> None:
    print("--> Initializing Database Connection & Table Invariants...", flush=True)
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        print("--> Pre-fetching existing curriculum database entities...", flush=True)
        # Prefetch to eliminate thousands of network round-trips
        currs_res = await session.execute(select(Curriculum))
        existing_currs = {c.code: c for c in currs_res.scalars().all()}

        topics_res = await session.execute(select(Topic))
        existing_topics = {(t.curriculum_id, t.code): t for t in topics_res.scalars().all()}

        skills_res = await session.execute(select(Skill))
        existing_skills = {s.code: s for s in skills_res.scalars().all()}

        questions_res = await session.execute(select(Question))
        existing_questions = {q.code: q for q in questions_res.scalars().all()}

        prereqs_res = await session.execute(select(Prerequisite))
        existing_prereqs = {
            (p.parent_skill_id, p.child_skill_id) for p in prereqs_res.scalars().all()
        }

        total_curricula_created = 0
        total_topics_created = 0
        total_skills_created = 0
        total_questions_created = 0
        total_questions_updated = 0

        for grade, subjects_dict in NCERT_DATA.items():
            for subject, topics_list in subjects_dict.items():
                curriculum_code = f"NCERT-{subject[:4].upper()}-C{grade}"
                print(
                    f"--> Seeding Grade {grade} {subject.title()} ({curriculum_code})...",
                    flush=True,
                )

                # 1. Upsert Curriculum
                curr = existing_currs.get(curriculum_code)
                if curr:
                    curr.grade = grade
                    curr.subject = subject
                    curr.board = "NCERT"
                    curr.version = "2024-2025"
                else:
                    curr = Curriculum(
                        id=uuid.uuid4(),
                        code=curriculum_code,
                        board="NCERT",
                        grade=grade,
                        subject=subject,
                        version="2024-2025",
                    )
                    session.add(curr)
                    existing_currs[curriculum_code] = curr
                    total_curricula_created += 1

                await session.flush()

                # 2. Iterate Topics
                for seq_idx, (t_code, t_name, t_desc, skills_list) in enumerate(
                    topics_list, start=1
                ):
                    topic_key = (curr.id, t_code)
                    topic = existing_topics.get(topic_key)

                    if topic:
                        topic.name = t_name
                        topic.description = t_desc
                        topic.sequence_order = seq_idx
                    else:
                        topic = Topic(
                            id=uuid.uuid4(),
                            curriculum_id=curr.id,
                            code=t_code,
                            name=t_name,
                            description=t_desc,
                            sequence_order=seq_idx,
                        )
                        session.add(topic)
                        existing_topics[topic_key] = topic
                        total_topics_created += 1

                    await session.flush()

                    # 3. Iterate Skills
                    prev_skill_id = None
                    for sk_code, sk_name, sk_desc, diff, blooms in skills_list:
                        skill = existing_skills.get(sk_code)

                        if skill:
                            skill.name = sk_name
                            skill.description = sk_desc
                            skill.difficulty = diff
                            skill.blooms_level = blooms
                        else:
                            skill = Skill(
                                id=uuid.uuid4(),
                                topic_id=topic.id,
                                code=sk_code,
                                name=sk_name,
                                description=sk_desc,
                                difficulty=diff,
                                blooms_level=blooms,
                            )
                            session.add(skill)
                            existing_skills[sk_code] = skill
                            total_skills_created += 1

                        await session.flush()

                        # Link sequential prerequisite DAG edge if within same topic
                        if prev_skill_id and prev_skill_id != skill.id:
                            edge_key = (prev_skill_id, skill.id)
                            if edge_key not in existing_prereqs:
                                session.add(
                                    Prerequisite(
                                        parent_skill_id=prev_skill_id,
                                        child_skill_id=skill.id,
                                        relation_type="hard",
                                    )
                                )
                                existing_prereqs.add(edge_key)

                        prev_skill_id = skill.id

                        # 4. Generate & seed calibrated questions for this skill
                        q_items = generate_authentic_questions_for_skill(
                            skill_code=sk_code,
                            skill_name=sk_name,
                            skill_description=sk_desc,
                            topic_name=t_name,
                            subject=subject,
                            grade=grade,
                        )

                        for q_data in q_items:
                            q_code = q_data["code"]
                            q_obj = existing_questions.get(q_code)
                            if not q_obj:
                                q_id = uuid.uuid4()
                                q_obj = Question(
                                    id=q_id,
                                    code=q_code,
                                    skill_id=skill.id,
                                    difficulty=q_data["difficulty"],
                                    question_type=q_data["question_type"],
                                    status="published",
                                    needs_teacher_review=False,
                                    version=1,
                                )
                                session.add(q_obj)
                                existing_questions[q_code] = q_obj
                                await session.flush()

                                # English Translation
                                q_trans_en = QuestionTranslation(
                                    id=uuid.uuid4(),
                                    question_id=q_obj.id,
                                    language="en",
                                    prompt=q_data["en_prompt"],
                                    options=q_data["options"],
                                    explanation=q_data["explanation"],
                                    hints=q_data["hints"],
                                )

                                # Hindi Translation
                                q_trans_hi = QuestionTranslation(
                                    id=uuid.uuid4(),
                                    question_id=q_obj.id,
                                    language="hi",
                                    prompt=q_data["hi_prompt"],
                                    options=q_data["options"],
                                    explanation=q_data["explanation"],
                                    hints=q_data["hints"],
                                )
                                session.add_all([q_trans_en, q_trans_hi])
                                total_questions_created += 1
                            else:
                                # Update existing question translations with authentic content
                                q_obj.difficulty = q_data["difficulty"]
                                q_obj.question_type = q_data["question_type"]
                                q_obj.status = "published"

                                t_stmt = select(QuestionTranslation).where(
                                    QuestionTranslation.question_id == q_obj.id
                                )
                                trans_list = (await session.execute(t_stmt)).scalars().all()
                                en_found = False
                                hi_found = False
                                for tr in trans_list:
                                    if tr.language == "en":
                                        tr.prompt = q_data["en_prompt"]
                                        tr.options = q_data["options"]
                                        tr.explanation = q_data["explanation"]
                                        tr.hints = q_data["hints"]
                                        session.add(tr)
                                        en_found = True
                                    elif tr.language == "hi":
                                        tr.prompt = q_data["hi_prompt"]
                                        tr.options = q_data["options"]
                                        tr.explanation = q_data["explanation"]
                                        tr.hints = q_data["hints"]
                                        session.add(tr)
                                        hi_found = True

                                if not en_found:
                                    session.add(
                                        QuestionTranslation(
                                            id=uuid.uuid4(),
                                            question_id=q_obj.id,
                                            language="en",
                                            prompt=q_data["en_prompt"],
                                            options=q_data["options"],
                                            explanation=q_data["explanation"],
                                            hints=q_data["hints"],
                                        )
                                    )
                                if not hi_found:
                                    session.add(
                                        QuestionTranslation(
                                            id=uuid.uuid4(),
                                            question_id=q_obj.id,
                                            language="hi",
                                            prompt=q_data["hi_prompt"],
                                            options=q_data["options"],
                                            explanation=q_data["explanation"],
                                            hints=q_data["hints"],
                                        )
                                    )
                                total_questions_updated += 1

                # Commit per subject to keep transactions responsive and durable
                await session.commit()

        print("\n========================================================", flush=True)
        print("--> NCERT CURRICULUM SEEDING COMPLETED SUCCESSFULLY!", flush=True)
        print(
            f"--> Curricula Created/Synced: {total_curricula_created} across Classes 6 to 10",
            flush=True,
        )
        print(f"--> Topics (Chapters) Created/Synced: {total_topics_created}", flush=True)
        print(f"--> Competency Skills Created/Synced: {total_skills_created}", flush=True)
        print(
            f"--> Questions Created: {total_questions_created} | Questions Refreshed with Authentic Content: {total_questions_updated}",
            flush=True,
        )
        print("========================================================\n", flush=True)


if __name__ == "__main__":
    asyncio.run(seed_all_curricula())
