"""Tests for DAG prerequisite cycle detection, self-loops, and orphan references."""

from __future__ import annotations

from typing import Any, cast

import pytest

from app.core.content_importer import validate_content_pack


@pytest.fixture
def base_valid_pack() -> dict[str, object]:
    """A minimal valid content pack."""
    return {
        "curriculum": {
            "code": "TEST-MATH",
            "board": "CBSE",
            "grade": 8,
            "subject": "mathematics",
            "version": "1.0",
        },
        "topics": [
            {"code": "TOPIC-1", "name": "Topic 1", "sequence_order": 1},
            {"code": "TOPIC-2", "name": "Topic 2", "sequence_order": 2},
        ],
        "skills": [
            {
                "code": "SKILL-A",
                "topic_code": "TOPIC-1",
                "name": "Skill A",
                "description": "Foundational skill A",
                "difficulty": 0.3,
                "blooms_level": "remember",
                "prerequisites": [],
            },
            {
                "code": "SKILL-B",
                "topic_code": "TOPIC-1",
                "name": "Skill B",
                "description": "Dependent skill B",
                "difficulty": 0.5,
                "blooms_level": "understand",
                "prerequisites": [{"skill_code": "SKILL-A", "relation_type": "hard"}],
            },
            {
                "code": "SKILL-C",
                "topic_code": "TOPIC-2",
                "name": "Skill C",
                "description": "Higher skill C",
                "difficulty": 0.7,
                "blooms_level": "apply",
                "prerequisites": [{"skill_code": "SKILL-B", "relation_type": "hard"}],
            },
        ],
        "glossary": [],
        "questions": [],
    }


def test_valid_dag_passes(base_valid_pack: dict[str, object]) -> None:
    """Linear prerequisite chain A -> B -> C is a valid DAG."""
    res = validate_content_pack(base_valid_pack)
    assert res.is_valid is True
    assert len(res.errors) == 0


def test_reject_self_loop_cycle(base_valid_pack: dict[str, object]) -> None:
    """A skill listing itself as a prerequisite must be rejected."""
    pack = dict(base_valid_pack)
    skills = list(cast(list[dict[str, Any]], pack["skills"]))
    skills[0] = {
        "code": "SKILL-A",
        "topic_code": "TOPIC-1",
        "name": "Skill A",
        "description": "Skill with self-loop",
        "difficulty": 0.3,
        "blooms_level": "remember",
        "prerequisites": [{"skill_code": "SKILL-A", "relation_type": "hard"}],
    }
    pack["skills"] = skills

    res = validate_content_pack(pack)
    assert res.is_valid is False
    assert any("cannot list itself as a prerequisite" in err for err in res.errors)


def test_reject_direct_two_node_cycle(base_valid_pack: dict[str, object]) -> None:
    """A -> B and B -> A forms a directed cycle and must be rejected."""
    pack = dict(base_valid_pack)
    skills = list(cast(list[dict[str, Any]], pack["skills"]))
    # Make A depend on B, while B depends on A
    skills[0] = {
        "code": "SKILL-A",
        "topic_code": "TOPIC-1",
        "name": "Skill A",
        "description": "Skill A",
        "difficulty": 0.3,
        "blooms_level": "remember",
        "prerequisites": [{"skill_code": "SKILL-B", "relation_type": "hard"}],
    }
    pack["skills"] = skills

    res = validate_content_pack(pack)
    assert res.is_valid is False
    assert any("Directed cycle detected" in err for err in res.errors)


def test_reject_three_node_cycle(base_valid_pack: dict[str, object]) -> None:
    """A -> B -> C -> A forms a directed cycle and must be rejected."""
    pack = dict(base_valid_pack)
    skills = list(cast(list[dict[str, Any]], pack["skills"]))
    # A depends on C, while C depends on B and B depends on A
    skills[0] = {
        "code": "SKILL-A",
        "topic_code": "TOPIC-1",
        "name": "Skill A",
        "description": "Skill A",
        "difficulty": 0.3,
        "blooms_level": "remember",
        "prerequisites": [{"skill_code": "SKILL-C", "relation_type": "hard"}],
    }
    pack["skills"] = skills

    res = validate_content_pack(pack)
    assert res.is_valid is False
    assert any("Directed cycle detected" in err for err in res.errors)


def test_reject_orphan_topic_reference(base_valid_pack: dict[str, object]) -> None:
    """A skill referencing a non-existent topic code must be rejected."""
    pack = dict(base_valid_pack)
    skills = list(cast(list[dict[str, Any]], pack["skills"]))
    skills[0] = {
        "code": "SKILL-A",
        "topic_code": "NON_EXISTENT_TOPIC",
        "name": "Skill A",
        "description": "Skill A",
        "difficulty": 0.3,
        "blooms_level": "remember",
        "prerequisites": [],
    }
    pack["skills"] = skills

    res = validate_content_pack(pack)
    assert res.is_valid is False
    assert any("references undeclared topic" in err for err in res.errors)


def test_reject_orphan_prerequisite_reference(base_valid_pack: dict[str, object]) -> None:
    """A skill referencing an undeclared prerequisite skill must be rejected."""
    pack = dict(base_valid_pack)
    skills = list(cast(list[dict[str, Any]], pack["skills"]))
    skills[1] = {
        "code": "SKILL-B",
        "topic_code": "TOPIC-1",
        "name": "Skill B",
        "description": "Skill B",
        "difficulty": 0.5,
        "blooms_level": "understand",
        "prerequisites": [{"skill_code": "GHOST-SKILL-99", "relation_type": "hard"}],
    }
    pack["skills"] = skills

    res = validate_content_pack(pack)
    assert res.is_valid is False
    assert any("references undeclared prerequisite" in err for err in res.errors)
