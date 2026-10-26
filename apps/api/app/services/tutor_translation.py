"""Multilingual translation guardrails, NCERT glossary integration, and teacher review workflow."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum import GlossaryTerm


async def lookup_glossary_terms(
    db: AsyncSession,
    text: str,
    curriculum_id: uuid.UUID | None = None,
) -> list[dict[str, str]]:
    """Query glossary terms that appear in the text to enforce canonical translations."""
    stmt = select(GlossaryTerm).where(GlossaryTerm.is_deleted.is_(False))
    if curriculum_id:
        stmt = stmt.where(GlossaryTerm.curriculum_id == curriculum_id)

    res = await db.execute(stmt)
    terms = res.scalars().all()

    lower_text = text.lower()
    matched_terms: list[dict[str, str]] = []

    for gt in terms:
        en_match = bool(re.search(rf"\b{re.escape(gt.term_en.lower())}\b", lower_text))
        hi_match = gt.term_hi in text
        if en_match or hi_match:
            matched_terms.append(
                {
                    "term_en": gt.term_en,
                    "term_hi": gt.term_hi,
                    "definition_en": gt.definition_en,
                    "definition_hi": gt.definition_hi,
                    "category": gt.category or "",
                }
            )

    return matched_terms


def align_terminology_with_glossary(
    text: str,
    glossary_terms: list[dict[str, str]] | dict[str, str],
    target_language: str = "hi",
) -> str:
    """Enforce canonical NCERT terms in generated explanations."""
    if not glossary_terms or not text:
        return text

    aligned = text
    terms_list = (
        glossary_terms
        if isinstance(glossary_terms, list)
        else [{"term_en": k, "term_hi": v} for k, v in glossary_terms.items()]
    )

    if target_language == "hi":
        for gt in terms_list:
            en_term = gt.get("term_en", "")
            hi_term = gt.get("term_hi", "")
            if not en_term or not hi_term:
                continue
            pattern = re.compile(rf"\b{re.escape(en_term)}\b", re.IGNORECASE)
            if pattern.search(aligned) and hi_term not in aligned:
                aligned = pattern.sub(f"{hi_term} ({en_term})", aligned)

    return aligned


async def mark_for_teacher_review(
    target: Any = None,
    question_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Flag machine-translated content as pending teacher review under editorial workflow."""
    if isinstance(target, AsyncSession) and question_id:
        from sqlalchemy import update

        from app.models.assessment import Question

        stmt = (
            update(Question)
            .where(Question.id == question_id)
            .values(needs_teacher_review=True, status="reviewed")
        )
        await target.execute(stmt)
        await target.commit()
        return {"needs_teacher_review": True, "review_status": "pending_teacher_approval"}

    meta = target.copy() if isinstance(target, dict) else {}
    meta["needs_teacher_review"] = True
    meta["review_status"] = "pending_teacher_approval"
    meta["editorial_notice"] = (
        "Machine-translated content marked as pending review until verified by an educator."
    )
    return meta
