"""Curriculum and content pack validation, DAG cycle detection, and idempotent importer."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import jsonschema
import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation, QuestionVersion
from app.models.curriculum import Curriculum, GlossaryTerm, Prerequisite, Skill, Topic


class ContentValidationError(Exception):
    """Raised when a content pack fails JSON schema or graph invariants."""

    def __init__(self, message: str, errors: list[str] | None = None) -> None:
        super().__init__(message)
        self.errors: list[str] = errors or [message]


class GraphCycleError(ContentValidationError):
    """Raised when prerequisite relationships contain one or more directed cycles."""

    def __init__(self, cycle_path: list[str]) -> None:
        path_str = " -> ".join(cycle_path)
        super().__init__(f"Prerequisite graph contains a directed cycle: {path_str}")
        self.cycle_path = cycle_path


class OrphanReferenceError(ContentValidationError):
    """Raised when a competency node or item references an undeclared parent entity."""

    def __init__(self, orphan_type: str, reference: str, parent: str) -> None:
        super().__init__(f"Orphan {orphan_type} '{reference}' references unknown {parent}")


@dataclass
class ValidationResult:
    """Outcome of validating a content pack against schema and graph rules."""

    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    curriculum_code: str = ""
    topics_count: int = 0
    skills_count: int = 0
    prerequisites_count: int = 0
    questions_count: int = 0
    glossary_count: int = 0


@dataclass
class ImportDiffReport:
    """Detailed summary of changes performed or calculated during pack import."""

    curriculum_created: int = 0
    curriculum_updated: int = 0
    topics_created: int = 0
    topics_updated: int = 0
    skills_created: int = 0
    skills_updated: int = 0
    prerequisites_created: int = 0
    prerequisites_updated: int = 0
    questions_created: int = 0
    questions_updated: int = 0
    glossary_created: int = 0
    glossary_updated: int = 0
    details: list[str] = field(default_factory=list)

    @property
    def total_mutations(self) -> int:
        return (
            self.curriculum_created
            + self.curriculum_updated
            + self.topics_created
            + self.topics_updated
            + self.skills_created
            + self.skills_updated
            + self.prerequisites_created
            + self.prerequisites_updated
            + self.questions_created
            + self.questions_updated
            + self.glossary_created
            + self.glossary_updated
        )


def _load_schema() -> dict[str, Any]:
    """Load JSON Schema definition for content packs."""
    # Look relative to repository root or current package
    possible_paths = [
        Path(__file__).resolve().parents[4] / "content" / "schema" / "content-pack.schema.json",
        Path(__file__).resolve().parents[3] / "content" / "schema" / "content-pack.schema.json",
        Path.cwd() / "content" / "schema" / "content-pack.schema.json",
        Path.cwd().parent / "content" / "schema" / "content-pack.schema.json",
        Path.cwd().parent.parent / "content" / "schema" / "content-pack.schema.json",
    ]
    for p in possible_paths:
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))  # type: ignore[no-any-return]

    raise FileNotFoundError("Could not find content-pack.schema.json")


def load_pack_from_path(pack_path: Path | str) -> dict[str, Any]:
    """Load content pack data from a JSON or YAML file, or directory with pack files."""
    path = Path(pack_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Content pack path does not exist: {path}")

    if path.is_file():
        text = path.read_text(encoding="utf-8")
        if path.suffix.lower() in {".yaml", ".yml"}:
            loaded = yaml.safe_load(text)
        else:
            loaded = json.loads(text)
        if not isinstance(loaded, dict):
            raise ContentValidationError(f"Content pack at {path} must be a JSON/YAML object")
        return loaded

    # If directory, look for unified pack or modular files
    for name in ["pack.json", "pack.yaml", "pack.yml"]:
        candidate = path / name
        if candidate.is_file():
            return load_pack_from_path(candidate)

    # Modular directory: check for curriculum, topics, skills, questions, glossary
    pack: dict[str, Any] = {}
    for part in ["curriculum", "topics", "skills", "questions", "glossary"]:
        for ext in [".json", ".yaml", ".yml"]:
            candidate = path / f"{part}{ext}"
            if candidate.is_file():
                part_text = candidate.read_text(encoding="utf-8")
                part_data = (
                    yaml.safe_load(part_text) if ext in [".yaml", ".yml"] else json.loads(part_text)
                )
                pack[part] = part_data
                break

    if "curriculum" in pack:
        return pack

    raise FileNotFoundError(
        f"Directory '{path}' does not contain 'pack.json', 'pack.yaml', or modular content files"
    )


def validate_content_pack(pack: dict[str, Any]) -> ValidationResult:
    """Validate content pack against JSON Schema Draft-07 and DAG invariants."""
    errors: list[str] = []
    warnings: list[str] = []

    # 1. Structural JSON Schema validation
    try:
        schema = _load_schema()
        validator = jsonschema.Draft7Validator(schema)
        for err in validator.iter_errors(pack):
            path_str = ".".join(str(p) for p in err.path) if err.path else "root"
            errors.append(f"[{path_str}] {err.message}")
    except Exception as exc:
        errors.append(f"Schema loading or validation error: {exc}")
        return ValidationResult(is_valid=False, errors=errors)

    if errors:
        return ValidationResult(is_valid=False, errors=errors)

    curriculum = pack.get("curriculum", {})
    topics = pack.get("topics", [])
    skills = pack.get("skills", [])
    questions = pack.get("questions", [])
    glossary = pack.get("glossary", [])

    topic_codes = {t["code"] for t in topics}
    skill_codes = {s["code"] for s in skills}

    # 2. Topic and Skill Reference Checks (No Orphans)
    for skill in skills:
        s_code = skill.get("code", "")
        t_code = skill.get("topic_code", "")
        if t_code not in topic_codes:
            errors.append(f"Skill '{s_code}' references undeclared topic '{t_code}'")

    # 3. DAG Prerequisite Graph Validation (Cycle & Orphan Detection)
    # Directed graph: parent_skill -> child_skill (child depends on parent)
    adjacency: dict[str, list[str]] = {s_code: [] for s_code in skill_codes}
    prereq_count = 0

    for skill in skills:
        child_code = skill.get("code", "")
        for prereq in skill.get("prerequisites", []):
            prereq_count += 1
            parent_code = prereq.get("skill_code", "")

            # Self-loop check
            if parent_code == child_code:
                errors.append(f"Skill '{child_code}' cannot list itself as a prerequisite")
                continue

            # Orphan check: parent must either exist in pack or be a valid external skill
            if parent_code not in skill_codes:
                errors.append(
                    f"Skill '{child_code}' references undeclared prerequisite '{parent_code}'"
                )
                continue

            adjacency[parent_code].append(child_code)

    # Cycle detection via 3-color DFS
    # 0 = unvisited (white), 1 = visiting (gray), 2 = visited (black)
    visited: dict[str, int] = dict.fromkeys(skill_codes, 0)
    current_path: list[str] = []

    def dfs(node: str) -> bool:
        visited[node] = 1
        current_path.append(node)

        for neighbor in adjacency.get(node, []):
            if visited.get(neighbor) == 1:
                # Cycle detected
                cycle_slice = [*current_path[current_path.index(neighbor) :], neighbor]
                errors.append(
                    f"Directed cycle detected in prerequisite graph: {' -> '.join(cycle_slice)}"
                )
                return True
            if visited.get(neighbor) == 0 and dfs(neighbor):
                return True

        current_path.pop()
        visited[node] = 2
        return False

    for s_code in skill_codes:
        if visited[s_code] == 0:
            dfs(s_code)

    # 4. Question Validation (Skill references, Hints, MCQ Answers)
    for q in questions:
        q_code = q.get("code", "")
        q_skill = q.get("skill_code", "")
        q_type = q.get("question_type", "")

        if q_skill not in skill_codes:
            errors.append(f"Question '{q_code}' references unknown skill '{q_skill}'")

        for tr in q.get("translations", []):
            lang = tr.get("language", "")
            hints = tr.get("hints", [])
            if len(hints) != 3:
                errors.append(
                    f"Question '{q_code}' ({lang}) must have exactly 3 hints, got {len(hints)}"
                )

            verified_answer = tr.get("verified_answer", "").strip()
            if not verified_answer:
                errors.append(f"Question '{q_code}' ({lang}) must have a non-empty verified_answer")

            if q_type == "mcq":
                opts = tr.get("options") or []
                if not opts:
                    errors.append(f"MCQ Question '{q_code}' ({lang}) has no options provided")
                else:
                    correct_opts = [o for o in opts if o.get("is_correct") is True]
                    if len(correct_opts) != 1:
                        errors.append(
                            f"MCQ Question '{q_code}' ({lang}) must have exactly 1 correct option, "
                            f"got {len(correct_opts)}"
                        )
                    elif correct_opts[0].get("id") != verified_answer:
                        errors.append(
                            f"MCQ Question '{q_code}' ({lang}) verified_answer '{verified_answer}' "
                            f"does not match correct option id '{correct_opts[0].get('id')}'"
                        )

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        curriculum_code=curriculum.get("code", ""),
        topics_count=len(topics),
        skills_count=len(skills),
        prerequisites_count=prereq_count,
        questions_count=len(questions),
        glossary_count=len(glossary),
    )


class ContentImporter:
    """Loads, validates, and idempotently upserts content packs into database."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def import_pack(
        self,
        pack_data: dict[str, Any],
        dry_run: bool = False,
    ) -> ImportDiffReport:
        """Validate and idempotently upsert curriculum pack into database."""
        val = validate_content_pack(pack_data)
        if not val.is_valid:
            raise ContentValidationError(
                f"Content pack validation failed with {len(val.errors)} error(s)",
                val.errors,
            )

        report = ImportDiffReport()

        curriculum_data = pack_data["curriculum"]
        curr_code = curriculum_data["code"]

        # 1. Upsert Curriculum
        curr_stmt = select(Curriculum).where(Curriculum.code == curr_code)
        curr_res = await self.session.execute(curr_stmt)
        curriculum = curr_res.scalar_one_or_none()

        if curriculum is None:
            curriculum = Curriculum(
                code=curr_code,
                board=curriculum_data["board"],
                grade=curriculum_data["grade"],
                subject=curriculum_data["subject"],
                version=curriculum_data["version"],
            )
            self.session.add(curriculum)
            await self.session.flush()
            report.curriculum_created += 1
            report.details.append(f"Created Curriculum {curr_code}")
        else:
            changed = False
            if curriculum.board != curriculum_data["board"]:
                curriculum.board = curriculum_data["board"]
                changed = True
            if curriculum.grade != curriculum_data["grade"]:
                curriculum.grade = curriculum_data["grade"]
                changed = True
            if curriculum.subject != curriculum_data["subject"]:
                curriculum.subject = curriculum_data["subject"]
                changed = True
            if curriculum.version != curriculum_data["version"]:
                curriculum.version = curriculum_data["version"]
                changed = True

            if changed:
                report.curriculum_updated += 1
                report.details.append(f"Updated Curriculum {curr_code}")

        # 2. Upsert Topics
        topic_map: dict[str, Topic] = {}
        for t_data in pack_data.get("topics", []):
            t_code = t_data["code"]
            t_stmt = select(Topic).where(Topic.curriculum_id == curriculum.id, Topic.code == t_code)
            t_res = await self.session.execute(t_stmt)
            topic = t_res.scalar_one_or_none()

            if topic is None:
                topic = Topic(
                    curriculum_id=curriculum.id,
                    code=t_code,
                    name=t_data["name"],
                    description=t_data.get("description"),
                    sequence_order=t_data.get("sequence_order", 0),
                )
                self.session.add(topic)
                await self.session.flush()
                report.topics_created += 1
                report.details.append(f"Created Topic {t_code}")
            else:
                changed = False
                if topic.name != t_data["name"]:
                    topic.name = t_data["name"]
                    changed = True
                if topic.description != t_data.get("description"):
                    topic.description = t_data.get("description")
                    changed = True
                if topic.sequence_order != t_data.get("sequence_order", 0):
                    topic.sequence_order = t_data.get("sequence_order", 0)
                    changed = True
                if changed:
                    report.topics_updated += 1
                    report.details.append(f"Updated Topic {t_code}")

            topic_map[t_code] = topic

        # 3. Upsert Skills
        skill_map: dict[str, Skill] = {}
        for s_data in pack_data.get("skills", []):
            s_code = s_data["code"]
            parent_topic = topic_map[s_data["topic_code"]]

            s_stmt = select(Skill).where(Skill.code == s_code)
            s_res = await self.session.execute(s_stmt)
            skill = s_res.scalar_one_or_none()

            if skill is None:
                skill = Skill(
                    topic_id=parent_topic.id,
                    code=s_code,
                    name=s_data["name"],
                    description=s_data["description"],
                    difficulty=float(s_data.get("difficulty", 0.5)),
                    blooms_level=s_data.get("blooms_level", "understand"),
                )
                self.session.add(skill)
                await self.session.flush()
                report.skills_created += 1
                report.details.append(f"Created Skill {s_code}")
            else:
                changed = False
                if skill.topic_id != parent_topic.id:
                    skill.topic_id = parent_topic.id
                    changed = True
                if skill.name != s_data["name"]:
                    skill.name = s_data["name"]
                    changed = True
                if skill.description != s_data["description"]:
                    skill.description = s_data["description"]
                    changed = True
                if abs(skill.difficulty - float(s_data.get("difficulty", 0.5))) > 1e-4:
                    skill.difficulty = float(s_data.get("difficulty", 0.5))
                    changed = True
                if skill.blooms_level != s_data.get("blooms_level", "understand"):
                    skill.blooms_level = s_data.get("blooms_level", "understand")
                    changed = True
                if changed:
                    report.skills_updated += 1
                    report.details.append(f"Updated Skill {s_code}")

            skill_map[s_code] = skill

        # 4. Upsert Prerequisites
        for s_data in pack_data.get("skills", []):
            child_code = s_data["code"]
            child_skill = skill_map[child_code]

            for p_data in s_data.get("prerequisites", []):
                parent_code = p_data["skill_code"]
                parent_skill = skill_map[parent_code]
                rel_type = p_data.get("relation_type", "hard")

                p_stmt = select(Prerequisite).where(
                    Prerequisite.parent_skill_id == parent_skill.id,
                    Prerequisite.child_skill_id == child_skill.id,
                )
                p_res = await self.session.execute(p_stmt)
                prereq = p_res.scalar_one_or_none()

                if prereq is None:
                    prereq = Prerequisite(
                        parent_skill_id=parent_skill.id,
                        child_skill_id=child_skill.id,
                        relation_type=rel_type,
                    )
                    self.session.add(prereq)
                    report.prerequisites_created += 1
                else:
                    if prereq.relation_type != rel_type:
                        prereq.relation_type = rel_type
                        report.prerequisites_updated += 1

        # 5. Upsert Glossary Terms
        for g_data in pack_data.get("glossary", []):
            term_en = g_data["term_en"]
            category = g_data.get("category")

            g_stmt = select(GlossaryTerm).where(
                GlossaryTerm.term_en == term_en, GlossaryTerm.category == category
            )
            g_res = await self.session.execute(g_stmt)
            glossary_term = g_res.scalar_one_or_none()

            if glossary_term is None:
                glossary_term = GlossaryTerm(
                    curriculum_id=curriculum.id,
                    term_en=term_en,
                    term_hi=g_data["term_hi"],
                    definition_en=g_data["definition_en"],
                    definition_hi=g_data["definition_hi"],
                    category=category,
                )
                self.session.add(glossary_term)
                report.glossary_created += 1
            else:
                changed = False
                if glossary_term.term_hi != g_data["term_hi"]:
                    glossary_term.term_hi = g_data["term_hi"]
                    changed = True
                if glossary_term.definition_en != g_data["definition_en"]:
                    glossary_term.definition_en = g_data["definition_en"]
                    changed = True
                if glossary_term.definition_hi != g_data["definition_hi"]:
                    glossary_term.definition_hi = g_data["definition_hi"]
                    changed = True
                if changed:
                    report.glossary_updated += 1

        # 6. Upsert Questions & Translations
        for q_data in pack_data.get("questions", []):
            q_code = q_data["code"]
            target_skill = skill_map[q_data["skill_code"]]
            difficulty = int(q_data.get("difficulty", 3))
            q_type = q_data.get("question_type", "mcq")
            status = q_data.get("status", "draft")
            needs_review = q_data.get("needs_teacher_review", True)

            q_stmt = select(Question).where(Question.code == q_code)
            q_res = await self.session.execute(q_stmt)
            question = q_res.scalar_one_or_none()

            is_new_question = question is None
            question_changed = False
            if is_new_question:
                question = Question(
                    code=q_code,
                    skill_id=target_skill.id,
                    difficulty=difficulty,
                    question_type=q_type,
                    status=status,
                    needs_teacher_review=needs_review,
                    version=1,
                )
                self.session.add(question)
                await self.session.flush()
                report.questions_created += 1
                report.details.append(f"Created Question {q_code}")
            else:
                assert question is not None
                if question.skill_id != target_skill.id:
                    question.skill_id = target_skill.id
                    question_changed = True
                if question.difficulty != difficulty:
                    question.difficulty = difficulty
                    question_changed = True
                if question.question_type != q_type:
                    question.question_type = q_type
                    question_changed = True
                if question.status != status:
                    question.status = status
                    question_changed = True
                if question.needs_teacher_review != needs_review:
                    question.needs_teacher_review = needs_review
                    question_changed = True

            # Translation handling
            for tr_data in q_data.get("translations", []):
                lang = tr_data["language"]
                tr_stmt = select(QuestionTranslation).where(
                    QuestionTranslation.question_id == question.id,
                    QuestionTranslation.language == lang,
                )
                tr_res = await self.session.execute(tr_stmt)
                translation = tr_res.scalar_one_or_none()

                if translation is None:
                    translation = QuestionTranslation(
                        question_id=question.id,
                        language=lang,
                        prompt=tr_data["prompt"],
                        options=tr_data.get("options"),
                        verified_answer=tr_data["verified_answer"],
                        worked_solution=tr_data["worked_solution"],
                        explanation=tr_data.get("explanation", ""),
                        hints=tr_data.get("hints", []),
                    )
                    self.session.add(translation)
                    if not is_new_question:
                        question_changed = True
                else:
                    tr_diff = False
                    if translation.prompt != tr_data["prompt"]:
                        translation.prompt = tr_data["prompt"]
                        tr_diff = True
                    if translation.options != tr_data.get("options"):
                        translation.options = tr_data.get("options")
                        tr_diff = True
                    if translation.verified_answer != tr_data["verified_answer"]:
                        translation.verified_answer = tr_data["verified_answer"]
                        tr_diff = True
                    if translation.worked_solution != tr_data["worked_solution"]:
                        translation.worked_solution = tr_data["worked_solution"]
                        tr_diff = True
                    if translation.explanation != tr_data.get("explanation", ""):
                        translation.explanation = tr_data.get("explanation", "")
                        tr_diff = True
                    if translation.hints != tr_data.get("hints", []):
                        translation.hints = tr_data.get("hints", [])
                        tr_diff = True

                    if tr_diff:
                        question_changed = True

            if not is_new_question and question_changed:
                question.version += 1
                report.questions_updated += 1
                report.details.append(f"Updated Question {q_code}")

            # Create version snapshot if new or updated
            if is_new_question or question_changed:
                snapshot = {
                    "code": q_code,
                    "difficulty": difficulty,
                    "question_type": q_type,
                    "status": status,
                    "translations": q_data.get("translations", []),
                }
                version_record = QuestionVersion(
                    question_id=question.id,
                    version_number=question.version,
                    status=question.status,
                    snapshot=snapshot,
                    change_reason="Imported via BodhAI Content Importer",
                )
                self.session.add(version_record)

        if dry_run:
            await self.session.rollback()
        else:
            await self.session.commit()

        return report
