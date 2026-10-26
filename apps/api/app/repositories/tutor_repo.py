"""Repository for AI tutor vector similarity retrieval, ingestion, and interaction logging."""

from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import Question, QuestionTranslation
from app.models.curriculum import Skill
from app.models.tutor import (
    CurriculumChunkEmbedding,
    TutorInteractionLog,
    TutorMonthlyCostBudget,
)


class TutorRepository:
    """Manages vector embeddings, published curriculum ingestion, and privacy interaction logs."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_published_curriculum_items(
        self,
        curriculum_id: uuid.UUID | None = None,
    ) -> tuple[list[tuple[Question, list[QuestionTranslation]]], list[Skill]]:
        """Fetch teacher-approved (published, non-flagged) questions, translations, and notes."""
        # 1. Published Questions (needs_teacher_review == False, status == 'published')
        q_stmt = (
            select(Question)
            .options(selectinload(Question.translations))
            .where(
                Question.status == "published",
                Question.needs_teacher_review.is_(False),
                Question.is_active.is_(True),
                Question.is_deleted.is_(False),
            )
        )
        s_stmt = select(Skill).where(Skill.is_deleted.is_(False))

        if curriculum_id:
            from app.models.curriculum import Topic

            q_stmt = (
                q_stmt.join(Skill, Question.skill_id == Skill.id)
                .join(Topic, Skill.topic_id == Topic.id)
                .where(Topic.curriculum_id == curriculum_id)
            )
            s_stmt = s_stmt.join(Topic, Skill.topic_id == Topic.id).where(
                Topic.curriculum_id == curriculum_id
            )

        q_res = await self.db.execute(q_stmt)
        questions = q_res.scalars().all()

        published_questions: list[tuple[Question, list[QuestionTranslation]]] = []
        for q in questions:
            valid_translations = [t for t in q.translations if t.worked_solution or t.explanation]
            if valid_translations:
                published_questions.append((q, valid_translations))

        # 2. Curriculum Skills & Notes
        s_res = await self.db.execute(s_stmt)
        skills = list(s_res.scalars().all())

        return published_questions, skills

    async def store_chunk_embeddings(
        self,
        chunks: list[dict[str, Any]],
    ) -> int:
        """Persist batch of embedded chunks into database."""
        count = 0
        for item in chunks:
            chunk = CurriculumChunkEmbedding(
                skill_id=item["skill_id"],
                language=item.get("language", "en"),
                version=item.get("version", 1),
                source_type=item["source_type"],
                source_id=item.get("source_id"),
                content=item["content"],
                vector=item["vector"],
            )
            self.db.add(chunk)
            count += 1
        await self.db.commit()
        return count

    async def clear_existing_chunks(self, skill_id: uuid.UUID | None = None) -> int:
        """Clear chunks for re-indexing."""
        stmt = delete(CurriculumChunkEmbedding)
        if skill_id:
            stmt = stmt.where(CurriculumChunkEmbedding.skill_id == skill_id)
        res = await self.db.execute(stmt)
        await self.db.commit()
        return int(getattr(res, "rowcount", 0) or 0)

    async def search_similar_chunks(
        self,
        skill_id: uuid.UUID,
        query_vector: list[float],
        language: str = "en",
        top_k: int = 5,
        min_threshold: float = 0.70,
    ) -> list[tuple[CurriculumChunkEmbedding, float]]:
        """Retrieve top-k similar chunks with minimum cosine similarity threshold.

        Supports pgvector with fallback calculation for SQLite in-memory tests.
        """
        # Query candidate chunks filtered by skill and language
        stmt = select(CurriculumChunkEmbedding).where(
            CurriculumChunkEmbedding.skill_id == skill_id,
            CurriculumChunkEmbedding.language == language,
        )
        res = await self.db.execute(stmt)
        candidates = list(res.scalars().all())

        if not candidates:
            # Fallback to language-agnostic chunks for this skill if specific language not found
            stmt_fallback = select(CurriculumChunkEmbedding).where(
                CurriculumChunkEmbedding.skill_id == skill_id
            )
            res_fb = await self.db.execute(stmt_fallback)
            candidates = list(res_fb.scalars().all())

        if not candidates:
            return []

        # Calculate cosine similarity
        scored: list[tuple[CurriculumChunkEmbedding, float]] = []
        for chunk in candidates:
            sim = self._calculate_cosine_similarity(query_vector, chunk.vector)
            if sim >= min_threshold:
                scored.append((chunk, sim))

        # Sort descending by similarity score
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    @staticmethod
    def _calculate_cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two unit-norm dense vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        score = dot_product / (norm_a * norm_b)
        return max(0.0, min(1.0, score))

    async def get_static_worked_solution(
        self,
        skill_id: uuid.UUID,
        language: str = "en",
        question_id: uuid.UUID | None = None,
    ) -> str | None:
        """Retrieve teacher-approved static worked solution as a zero-hallucination fallback."""
        if question_id:
            stmt = (
                select(QuestionTranslation.worked_solution)
                .join(Question)
                .where(
                    Question.id == question_id,
                    Question.status == "published",
                    Question.needs_teacher_review.is_(False),
                    QuestionTranslation.language == language,
                )
            )
            res = await self.db.execute(stmt)
            solution = res.scalar_one_or_none()
            if solution:
                return str(solution)

        # Fallback to any published question for this skill
        stmt_fallback = (
            select(QuestionTranslation.worked_solution)
            .join(Question)
            .where(
                Question.skill_id == skill_id,
                Question.status == "published",
                Question.needs_teacher_review.is_(False),
                QuestionTranslation.language == language,
                QuestionTranslation.worked_solution != "",
            )
            .limit(1)
        )
        res_fb = await self.db.execute(stmt_fallback)
        sol_fb = res_fb.scalar_one_or_none()
        if sol_fb:
            return str(sol_fb)

        # Final fallback: skill description
        sk_stmt = select(Skill.description).where(Skill.id == skill_id)
        sk_res = await self.db.execute(sk_stmt)
        desc = sk_res.scalar_one_or_none()
        return str(desc) if desc else None

    async def log_interaction(
        self,
        student_id: uuid.UUID,
        skill_id: uuid.UUID,
        query_scrubbed: str,
        response_text: str,
        tokens_used: int = 0,
        cost_usd: float = 0.0,
        retrieval_similarity: float = 0.0,
        flagged_injection: bool = False,
        flagged_off_topic: bool = False,
        static_fallback_used: bool = False,
    ) -> TutorInteractionLog:
        """Log interaction with privacy-scrubbed text under DPDP compliance."""
        log = TutorInteractionLog(
            student_id=student_id,
            skill_id=skill_id,
            query_scrubbed=query_scrubbed,
            response_text=response_text,
            tokens_used=tokens_used,
            cost_usd=cost_usd,
            retrieval_similarity=retrieval_similarity,
            flagged_injection=flagged_injection,
            flagged_off_topic=flagged_off_topic,
            static_fallback_used=static_fallback_used,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def prune_logs_older_than(
        self,
        retention_days: int = 90,
        days: int | None = None,
    ) -> int:
        """Enforce DPDP storage limitation by pruning logs older than retention period."""
        effective_days = days if days is not None else retention_days
        cutoff = datetime.now(UTC) - timedelta(days=effective_days)
        stmt = delete(TutorInteractionLog).where(TutorInteractionLog.created_at < cutoff)
        res = await self.db.execute(stmt)
        await self.db.commit()
        return int(getattr(res, "rowcount", 0) or 0)

    async def get_or_create_monthly_budget(
        self,
        billing_month: str,
        budget_limit_usd: float = 50.0,
    ) -> TutorMonthlyCostBudget:
        """Get or initialize monthly budget record in database."""
        stmt = select(TutorMonthlyCostBudget).where(
            TutorMonthlyCostBudget.billing_month == billing_month
        )
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            record = TutorMonthlyCostBudget(
                billing_month=billing_month,
                total_tokens=0,
                total_cost_usd=0.0,
                budget_limit_usd=budget_limit_usd,
                alert_triggered=False,
            )
            self.db.add(record)
            await self.db.commit()
            await self.db.refresh(record)
        return record
