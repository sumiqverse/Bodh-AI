"""Unit tests for root-cause search algorithms: NetworkX vs Recursive vs SQL CTE equivalence."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.models import MasteryState, SkillState
from app.engine.root_cause import (
    find_deepest_unmastered_networkx,
    find_deepest_unmastered_recursive_algorithm,
)


@pytest.fixture
def sample_dag() -> tuple[list[tuple[str, str]], dict[str, SkillState]]:
    """Build a diamond-shaped prerequisite knowledge graph.

    Prerequisite DAG structure:
      MATH-01 (unmastered, depth 3) -> MATH-02 (unmastered, depth 2) -> MATH-04 (target)
      MATH-01 -> MATH-03 (mastered, depth 2) -> MATH-04 (target)
      MATH-05 (independent prerequisite, unmastered, depth 1) -> MATH-04 (target)
    """
    edges = [
        ("MATH-01", "MATH-02"),
        ("MATH-02", "MATH-04"),
        ("MATH-01", "MATH-03"),
        ("MATH-03", "MATH-04"),
        ("MATH-05", "MATH-04"),
    ]

    skill_states = {
        "MATH-01": SkillState(skill_id="MATH-01", p_mastery=0.20, state=MasteryState.NOT_LEARNED),
        "MATH-02": SkillState(skill_id="MATH-02", p_mastery=0.35, state=MasteryState.NOT_LEARNED),
        "MATH-03": SkillState(skill_id="MATH-03", p_mastery=0.98, state=MasteryState.MASTERED),
        "MATH-04": SkillState(skill_id="MATH-04", p_mastery=0.25, state=MasteryState.NOT_LEARNED),
        "MATH-05": SkillState(skill_id="MATH-05", p_mastery=0.30, state=MasteryState.NOT_LEARNED),
    }

    return edges, skill_states


def test_networkx_vs_recursive_equivalence(
    sample_dag: tuple[list[tuple[str, str]], dict[str, SkillState]],
) -> None:
    """Assert NetworkX and pure recursive algorithms return identical root-cause diagnoses."""
    edges, states = sample_dag
    target = "MATH-04"

    res_nx = find_deepest_unmastered_networkx(
        target_skill_id=target,
        edges=edges,
        skill_states=states,
        unmastered_threshold=0.40,
    )

    res_rec = find_deepest_unmastered_recursive_algorithm(
        target_skill_id=target,
        edges=edges,
        skill_states=states,
        unmastered_threshold=0.40,
    )

    assert res_nx is not None
    assert res_rec is not None

    # Deepest unmastered prerequisite must be MATH-01 at depth 2 (path length 2 from target)
    assert res_nx.skill_id == "MATH-01"
    assert res_rec.skill_id == "MATH-01"
    assert res_nx.depth == res_rec.depth
    assert res_nx.p_mastery == res_rec.p_mastery
    assert res_nx.path_from_target == res_rec.path_from_target


def test_sql_cte_query_equivalence(
    sample_dag: tuple[list[tuple[str, str]], dict[str, SkillState]],
) -> None:
    """Test SQL recursive CTE against in-memory NetworkX on SQLite in-memory DB."""
    import sqlite3

    edges, states = sample_dag
    target = "MATH-04"

    # Set up in-memory SQLite table
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute(
        "CREATE TABLE prerequisites (parent_skill_id TEXT, child_skill_id TEXT, relation_type TEXT)"
    )
    cursor.execute("CREATE TABLE mastery (skill_id TEXT, p_mastery REAL)")

    for p, c in edges:
        cursor.execute("INSERT INTO prerequisites VALUES (?, ?, 'hard')", (p, c))

    for sid, st in states.items():
        cursor.execute("INSERT INTO mastery VALUES (?, ?)", (sid, st.p_mastery))

    conn.commit()

    # Run SQL Recursive CTE
    cte_query = """
    WITH RECURSIVE prereq_tree AS (
        SELECT
            p.parent_skill_id AS skill_id,
            1 AS depth,
            p.child_skill_id || ' -> ' || p.parent_skill_id AS path
        FROM prerequisites p
        WHERE p.child_skill_id = ?

        UNION ALL

        SELECT
            p.parent_skill_id AS skill_id,
            pt.depth + 1 AS depth,
            pt.path || ' -> ' || p.parent_skill_id AS path
        FROM prerequisites p
        INNER JOIN prereq_tree pt ON p.child_skill_id = pt.skill_id
        WHERE pt.depth < 10
    )
    SELECT pt.skill_id, pt.depth, m.p_mastery
    FROM prereq_tree pt
    LEFT JOIN mastery m ON pt.skill_id = m.skill_id
    WHERE COALESCE(m.p_mastery, 0.10) < 0.40
    ORDER BY pt.depth DESC, pt.skill_id ASC
    LIMIT 1;
    """

    cursor.execute(cte_query, (target,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    sql_skill_id, sql_depth, sql_p = row

    res_nx = find_deepest_unmastered_networkx(target, edges, states, 0.40)
    assert res_nx is not None

    # Both must identify MATH-01 as deepest unmastered prerequisite
    assert sql_skill_id == res_nx.skill_id
    assert sql_depth == res_nx.depth
    assert pytest.approx(sql_p, rel=1e-4) == res_nx.p_mastery


def test_root_cause_when_all_mastered() -> None:
    """When all prerequisites are mastered, root-cause search returns None."""
    edges = [("A", "B"), ("B", "C")]
    states = {
        "A": SkillState(skill_id="A", p_mastery=0.98, state=MasteryState.MASTERED),
        "B": SkillState(skill_id="B", p_mastery=0.96, state=MasteryState.MASTERED),
        "C": SkillState(skill_id="C", p_mastery=0.20, state=MasteryState.NOT_LEARNED),
    }
    res = find_deepest_unmastered_networkx("C", edges, states, 0.40)
    assert res is None


@pytest.mark.asyncio
async def test_find_root_cause_sql(db_session: AsyncSession) -> None:
    """Verify recursive CTE execution via find_root_cause_sql."""
    import uuid

    from app.engine.root_cause import find_deepest_unmastered_sql_cte
    from app.models.assessment import Mastery
    from app.models.curriculum import Prerequisite
    from tests.factories import SkillFactory

    student_id = uuid.uuid4()
    sk_parent = SkillFactory.build(difficulty=0.3)
    sk_child = SkillFactory.build(difficulty=0.7)
    db_session.add_all([sk_parent, sk_child])
    await db_session.flush()

    prereq = Prerequisite(
        parent_skill_id=sk_parent.id, child_skill_id=sk_child.id, relation_type="hard"
    )
    mastery = Mastery(
        student_id=student_id,
        skill_id=sk_parent.id,
        p_mastery=0.15,
        confidence=0.8,
        attempts_count=2,
    )
    db_session.add_all([prereq, mastery])
    await db_session.flush()

    result = await find_deepest_unmastered_sql_cte(
        session=db_session,
        target_skill_id=sk_child.id,
        student_id=student_id,
        unmastered_threshold=0.40,
    )
    assert result is not None
    assert result.skill_id == str(sk_parent.id)
    assert result.depth == 1
    assert result.p_mastery == 0.15
