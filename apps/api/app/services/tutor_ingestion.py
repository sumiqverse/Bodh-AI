"""Content ingestion pipeline: chunking, embedding, and indexing published curriculum items."""

from __future__ import annotations

import time
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.repositories.tutor_repo import TutorRepository
from app.schemas.tutor import TutorIngestResponse
from app.services.tutor_provider import LLMProvider, get_llm_provider


class TutorIngestionService:
    """Pipelines published notes and teacher explanations into vector storage."""

    def __init__(
        self,
        db: AsyncSession,
        settings: Settings,
        provider: LLMProvider | None = None,
    ) -> None:
        self.db = db
        self.settings = settings
        self.repo = TutorRepository(db)
        self.provider = provider or get_llm_provider(settings)

    async def ingest_published_curriculum(
        self,
        curriculum_id: uuid.UUID | None = None,
        force_reindex: bool = False,
    ) -> TutorIngestResponse:
        """Filter published teacher explanations and notes, chunk, embed, and store."""
        start_time = time.time()

        if force_reindex:
            await self.repo.clear_existing_chunks()

        # 1. Fetch only teacher-approved questions and curriculum skills
        published_questions, skills = await self.repo.get_published_curriculum_items(curriculum_id)

        raw_chunks: list[dict[str, Any]] = []

        # 2. Chunk published question explanations and worked solutions
        for q, translations in published_questions:
            for tr in translations:
                lang = tr.language
                item_label = q.code or "Item"

                # Worked solution chunk
                if tr.worked_solution and tr.worked_solution.strip():
                    raw_chunks.append(
                        {
                            "skill_id": q.skill_id,
                            "language": lang,
                            "version": q.version,
                            "source_type": "worked_solution",
                            "source_id": q.id,
                            "content": (
                                f"Verified Worked Solution ({item_label}):\n"
                                f"{tr.worked_solution.strip()}"
                            ),
                        }
                    )

                # Conceptual explanation chunk
                if tr.explanation and tr.explanation.strip():
                    raw_chunks.append(
                        {
                            "skill_id": q.skill_id,
                            "language": lang,
                            "version": q.version,
                            "source_type": "question_explanation",
                            "source_id": q.id,
                            "content": (
                                f"Curriculum Concept Explanation ({item_label}):\n"
                                f"{tr.explanation.strip()}"
                            ),
                        }
                    )

                # Hints ladder chunks
                if tr.hints and isinstance(tr.hints, list):
                    for h_idx, hint_text in enumerate(tr.hints, 1):
                        hint_str = str(hint_text).strip()
                        if hint_str:
                            raw_chunks.append(
                                {
                                    "skill_id": q.skill_id,
                                    "language": lang,
                                    "version": q.version,
                                    "source_type": f"hint_level_{h_idx}",
                                    "source_id": q.id,
                                    "content": f"Scaffolded Hint L{h_idx}:\n{hint_str}",
                                }
                            )

        # 3. Chunk skill curriculum definitions
        for sk in skills:
            if sk.description and sk.description.strip():
                raw_chunks.append(
                    {
                        "skill_id": sk.id,
                        "language": "en",
                        "version": 1,
                        "source_type": "curriculum_note",
                        "source_id": sk.id,
                        "content": (
                            f"Competency Definition ({sk.code} - {sk.name}):\n"
                            f"{sk.description.strip()}"
                        ),
                    }
                )

        if not raw_chunks:
            return TutorIngestResponse(
                total_published_questions_indexed=len(published_questions),
                total_curriculum_notes_indexed=len(skills),
                total_chunks_created=0,
                duration_seconds=round(time.time() - start_time, 3),
            )

        # 4. Generate batch embeddings
        texts_to_embed = [chunk["content"] for chunk in raw_chunks]
        embeddings = await self.provider.get_embeddings(texts_to_embed)

        for chunk, vec in zip(raw_chunks, embeddings, strict=True):
            chunk["vector"] = vec

        # 5. Persist into pgvector database table
        saved_count = await self.repo.store_chunk_embeddings(raw_chunks)

        return TutorIngestResponse(
            total_published_questions_indexed=len(published_questions),
            total_curriculum_notes_indexed=len(skills),
            total_chunks_created=saved_count,
            duration_seconds=round(time.time() - start_time, 3),
        )
