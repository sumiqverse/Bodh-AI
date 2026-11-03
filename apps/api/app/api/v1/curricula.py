"""Curricula and topics API v1 routes."""

from collections.abc import Sequence
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.core.errors import NotFoundError
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic
from app.repositories.curriculum_repo import CurriculumRepository
from app.schemas.curriculum import (
    ContentImportResponse,
    CurriculumResponse,
    CurriculumSearchResponse,
    GraphEdge,
    GraphNode,
    SearchSkillItem,
    SearchTopicItem,
    SkillGraphResponse,
    TopicResponse,
)

router = APIRouter(prefix="/curricula", tags=["Curriculum"])


@router.get("/search", response_model=CurriculumSearchResponse, summary="Search Topics and Skills")
async def search_curricula_content(
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    q: Annotated[str, Query(min_length=1, description="Search query string")] = "",
    grade: Annotated[int | None, Query(ge=6, le=10, description="Grade filter (6-10)")] = None,
    subject: Annotated[str | None, Query(description="Subject filter")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> CurriculumSearchResponse:
    """Search topics and competencies across NCERT Classes 6-10."""
    from sqlalchemy import select

    term = f"%{q.strip()}%"

    # 1. Search Topics
    t_stmt = (
        select(Topic, Curriculum)
        .join(Curriculum, Topic.curriculum_id == Curriculum.id)
        .where(
            (Topic.name.ilike(term)) | (Topic.description.ilike(term)) | (Topic.code.ilike(term))
        )
    )
    if grade is not None:
        t_stmt = t_stmt.where(Curriculum.grade == grade)
    if subject:
        t_stmt = t_stmt.where(Curriculum.subject.ilike(f"%{subject.strip()}%"))
    t_stmt = t_stmt.order_by(Curriculum.grade, Topic.sequence_order).limit(limit)

    t_res = await session.execute(t_stmt)
    topic_matches = [
        SearchTopicItem(
            id=topic.id,
            code=topic.code,
            name=topic.name,
            description=topic.description,
            sequence_order=topic.sequence_order,
            curriculum_id=curr.id,
            curriculum_code=curr.code,
            grade=curr.grade,
            subject=curr.subject,
        )
        for topic, curr in t_res.all()
    ]

    # 2. Search Skills
    s_stmt = (
        select(Skill, Topic, Curriculum)
        .join(Topic, Skill.topic_id == Topic.id)
        .join(Curriculum, Topic.curriculum_id == Curriculum.id)
        .where(
            (Skill.name.ilike(term)) | (Skill.description.ilike(term)) | (Skill.code.ilike(term))
        )
    )
    if grade is not None:
        s_stmt = s_stmt.where(Curriculum.grade == grade)
    if subject:
        s_stmt = s_stmt.where(Curriculum.subject.ilike(f"%{subject.strip()}%"))
    s_stmt = s_stmt.order_by(Curriculum.grade, Skill.name).limit(limit)

    s_res = await session.execute(s_stmt)
    skill_matches = [
        SearchSkillItem(
            id=skill.id,
            code=skill.code,
            name=skill.name,
            description=skill.description,
            difficulty=skill.difficulty,
            blooms_level=skill.blooms_level,
            topic_id=top.id,
            topic_code=top.code,
            topic_name=top.name,
            grade=curr.grade,
            subject=curr.subject,
        )
        for skill, top, curr in s_res.all()
    ]

    return CurriculumSearchResponse(
        query=q,
        grade=grade,
        subject=subject,
        total_topics=len(topic_matches),
        total_skills=len(skill_matches),
        topics=topic_matches,
        skills=skill_matches,
    )


@router.get("", response_model=list[CurriculumResponse], summary="List Curricula")
async def list_curricula(
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    grade: Annotated[
        int | None, Query(ge=6, le=10, description="Grade filter (Classes 6-10)")
    ] = None,
    board: Annotated[
        str | None, Query(description="Board filter (CBSE, NCERT, STATE_BOARD)")
    ] = None,
) -> Sequence[CurriculumResponse]:
    """Retrieve educational curricula filtered by grade or board."""
    repo = CurriculumRepository(session)
    curricula = await repo.list_by_grade_and_board(grade=grade, board=board)
    return [
        CurriculumResponse(
            id=c.id,
            code=c.code,
            board=c.board,
            grade=c.grade,
            subject=c.subject,
            version=c.version,
            topics=[
                TopicResponse(
                    id=t.id,
                    code=t.code,
                    name=t.name,
                    description=t.description,
                    sequence_order=t.sequence_order,
                )
                for t in c.topics
            ],
        )
        for c in curricula
    ]


@router.get("/{code}", response_model=CurriculumResponse, summary="Get Curriculum by Code")
async def get_curriculum(
    code: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
) -> CurriculumResponse:
    """Retrieve curriculum by its unique code identifier."""
    repo = CurriculumRepository(session)
    curriculum = await repo.get_by_code(code)
    if curriculum is None:
        raise NotFoundError("Curriculum", code)

    return CurriculumResponse(
        id=curriculum.id,
        code=curriculum.code,
        board=curriculum.board,
        grade=curriculum.grade,
        subject=curriculum.subject,
        version=curriculum.version,
        topics=[
            TopicResponse(
                id=t.id,
                code=t.code,
                name=t.name,
                description=t.description,
                sequence_order=t.sequence_order,
            )
            for t in curriculum.topics
        ],
    )


@router.get("/{code}/topics", response_model=list[TopicResponse], summary="List Curriculum Topics")
async def get_curriculum_topics(
    code: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[TopicResponse]:
    """Retrieve ordered topics for a specific curriculum framework."""
    repo = CurriculumRepository(session)
    curriculum = await repo.get_by_code(code)
    if curriculum is None:
        raise NotFoundError("Curriculum", code)

    topics = await repo.get_topics(curriculum.id)
    return [
        TopicResponse(
            id=t.id,
            code=t.code,
            name=t.name,
            description=t.description,
            sequence_order=t.sequence_order,
        )
        for t in topics
    ]


@router.get(
    "/{code}/graph", response_model=SkillGraphResponse, summary="Get Skill Dependency Graph"
)
async def get_curriculum_graph(
    code: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SkillGraphResponse:
    """Retrieve full curriculum topic and skill nodes with directed prerequisite DAG edges."""
    from sqlalchemy import select

    from app.models.curriculum import Prerequisite, Skill, Topic

    repo = CurriculumRepository(session)
    curriculum = await repo.get_by_code(code)
    if curriculum is None:
        raise NotFoundError("Curriculum", code)

    # 1. Fetch topics
    t_stmt = (
        select(Topic).where(Topic.curriculum_id == curriculum.id).order_by(Topic.sequence_order)
    )
    t_res = await session.execute(t_stmt)
    topics = t_res.scalars().all()
    topic_map = {t.id: t for t in topics}

    # 2. Fetch skills
    topic_ids = list(topic_map.keys())
    skills: list[Skill] = []
    if topic_ids:
        s_stmt = select(Skill).where(Skill.topic_id.in_(topic_ids))
        s_res = await session.execute(s_stmt)
        skills = list(s_res.scalars().all())

    skill_ids = [s.id for s in skills]

    # 3. Fetch prerequisites
    edges: list[GraphEdge] = []
    if skill_ids:
        p_stmt = select(Prerequisite).where(
            Prerequisite.child_skill_id.in_(skill_ids) | Prerequisite.parent_skill_id.in_(skill_ids)
        )
        p_res = await session.execute(p_stmt)
        prereqs = p_res.scalars().all()
        for p in prereqs:
            edges.append(
                GraphEdge(
                    id=str(p.id),
                    source=str(p.parent_skill_id),
                    target=str(p.child_skill_id),
                    relation_type=p.relation_type,
                )
            )

    # 4. Build nodes
    nodes: list[GraphNode] = []
    # Topic nodes
    for t in topics:
        nodes.append(
            GraphNode(
                id=str(t.id),
                code=t.code,
                name=t.name,
                type="topic",
                topic_code=t.code,
                topic_name=t.name,
            )
        )
    # Skill nodes
    for s in skills:
        parent_topic = topic_map.get(s.topic_id)
        nodes.append(
            GraphNode(
                id=str(s.id),
                code=s.code,
                name=s.name,
                type="skill",
                topic_code=parent_topic.code if parent_topic else None,
                topic_name=parent_topic.name if parent_topic else None,
                difficulty=s.difficulty,
                blooms_level=s.blooms_level,
            )
        )

    return SkillGraphResponse(
        curriculum_code=curriculum.code,
        curriculum_name=f"{curriculum.board} Grade {curriculum.grade} {curriculum.subject.title()}",
        nodes=nodes,
        edges=edges,
    )


@router.post("/import", response_model=ContentImportResponse, summary="Bulk Import Content Pack")
async def import_content_pack(
    pack_data: dict[str, Any],
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin"))],
    dry_run: Annotated[
        bool, Query(description="Simulate import without persisting changes")
    ] = False,
) -> ContentImportResponse:
    """Import a shared curriculum content pack (administrators only)."""
    from fastapi import HTTPException, status

    from app.core.content_importer import ContentImporter, ContentValidationError

    importer = ContentImporter(session)
    try:
        diff = await importer.import_pack(pack_data, dry_run=dry_run)
    except ContentValidationError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(err), "errors": err.errors},
        ) from err
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content import failed: {exc}",
        ) from exc

    curr_code = pack_data.get("curriculum", {}).get("code", "")
    return ContentImportResponse(
        curriculum_code=curr_code,
        curriculum_created=diff.curriculum_created,
        curriculum_updated=diff.curriculum_updated,
        topics_created=diff.topics_created,
        topics_updated=diff.topics_updated,
        skills_created=diff.skills_created,
        skills_updated=diff.skills_updated,
        prerequisites_created=diff.prerequisites_created,
        prerequisites_updated=diff.prerequisites_updated,
        glossary_created=diff.glossary_created,
        glossary_updated=diff.glossary_updated,
        questions_created=diff.questions_created,
        questions_updated=diff.questions_updated,
        total_mutations=diff.total_mutations,
        details=diff.details,
    )
