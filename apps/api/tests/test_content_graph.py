"""CI Graph and Content Pack Validation Test.

Validates every content pack in content/ against JSON Schema Draft-07 and DAG invariants.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core.content_importer import load_pack_from_path, validate_content_pack


def _find_all_content_packs() -> list[Path]:
    """Discover all content pack directories or files in content/."""
    root = Path(__file__).resolve().parents[3]
    content_dir = root / "content"
    if not content_dir.exists():
        return []

    packs: list[Path] = []
    for item in content_dir.iterdir():
        if (
            item.is_dir()
            and item.name not in {"schema", "curriculum"}
            and ((item / "pack.json").exists() or (item / "pack.yaml").exists())
        ):
            packs.append(item)
    return packs


PACKS = _find_all_content_packs()


@pytest.mark.parametrize("pack_path", PACKS, ids=lambda p: p.name)
def test_content_pack_schema_and_graph_invariants(pack_path: Path) -> None:
    """Every content pack must satisfy JSON Schema Draft-07, zero cycles, and zero orphans."""
    pack_data = load_pack_from_path(pack_path)
    result = validate_content_pack(pack_data)

    assert result.is_valid is True, f"Validation failed for pack {pack_path.name}: {result.errors}"
    assert result.topics_count > 0, "Pack must contain at least one topic"
    assert result.skills_count > 0, "Pack must contain at least one skill"
    assert result.prerequisites_count >= 0
    assert len(result.errors) == 0


def test_class8_maths_pack_specific_requirements() -> None:
    """Verify that the seeded Class 8 Maths pack meets all prompt requirements."""
    root = Path(__file__).resolve().parents[3]
    pack_path = root / "content" / "class8-maths"
    assert pack_path.exists(), "content/class8-maths directory must exist"

    pack_data = load_pack_from_path(pack_path)
    result = validate_content_pack(pack_data)

    assert result.is_valid is True, f"class8-maths pack validation failed: {result.errors}"
    # Verify topic count: about 60 topics
    assert 50 <= result.topics_count <= 70, f"Expected ~60 topics, got {result.topics_count}"
    # Verify skill count: about 150 skills
    assert 140 <= result.skills_count <= 160, f"Expected ~150 skills, got {result.skills_count}"
    # Verify question count: at least 200 questions (20 questions for each of 10 skills)
    assert result.questions_count >= 200, f"Expected >= 200 questions, got {result.questions_count}"
    # Verify glossary
    assert result.glossary_count >= 20

    # Verify that all seeded questions have needs_teacher_review = True
    for q in pack_data["questions"]:
        assert q["needs_teacher_review"] is True, f"Question {q['code']} must need teacher review"
        assert q["status"] == "draft", f"Question {q['code']} initial status must be draft"
        assert len(q["translations"]) >= 2, f"Question {q['code']} must have EN and HI translations"
        for tr in q["translations"]:
            assert len(tr["hints"]) == 3, (
                f"Question {q['code']} must have exactly 3 progressive hints"
            )
            assert len(tr["prompt"].strip()) > 0
            assert len(tr["verified_answer"].strip()) > 0
            assert len(tr["worked_solution"].strip()) > 0
