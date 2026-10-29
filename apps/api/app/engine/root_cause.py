"""Root-cause recursive search finding the deepest unmastered prerequisite in the DAG."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import networkx as nx  # type: ignore[import-untyped]
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.models import MasteryState, SkillState


@dataclass(frozen=True)
class RootCauseResult:
    """Result of root-cause traversal identifying the source of cognitive difficulty."""

    skill_id: str
    depth: int
    p_mastery: float
    state: MasteryState
    path_from_target: list[str]


def find_deepest_unmastered_networkx(
    target_skill_id: str,
    edges: list[tuple[str, str]],
    skill_states: dict[str, SkillState] | dict[str, float],
    unmastered_threshold: float = 0.40,
) -> RootCauseResult | None:
    """Find deepest unmastered prerequisite using an in-memory NetworkX DAG.

    Directed edge convention: (prerequisite_parent, dependent_child).
    To trace root causes, we walk backward from dependent_child to prerequisite_parents.
    """
    # Build graph: parent -> child
    graph = nx.DiGraph()
    for parent, child in edges:
        graph.add_edge(parent, child)

    if target_skill_id not in graph:
        return None

    # Walk backward along incoming edges (in-edges = prerequisites of target)
    # BFS / DFS traversal computing distance and shortest path from target
    candidates: list[tuple[str, int, float, list[str]]] = []

    # Queue contains: (current_node, depth, path_so_far)
    queue: list[tuple[str, int, list[str]]] = [
        (parent, 1, [target_skill_id, parent]) for parent in graph.predecessors(target_skill_id)
    ]
    visited: set[str] = set()

    while queue:
        curr, depth, path = queue.pop(0)
        if curr in visited:
            continue
        visited.add(curr)

        # Get mastery probability
        node_state = skill_states.get(curr)
        if isinstance(node_state, SkillState):
            p = node_state.p_mastery
        elif isinstance(node_state, (int, float)):
            p = float(node_state)
        else:
            p = 0.10

        if p < unmastered_threshold:
            candidates.append((curr, depth, p, path))

        # Enqueue upstream prerequisites (parents of current node)
        for parent in graph.predecessors(curr):
            if parent not in visited:
                queue.append((parent, depth + 1, [*path, parent]))

    if not candidates:
        return None

    # Sort candidates by:
    # 1. Depth descending (deepest foundation first)
    # 2. Probability ascending (most severe gap first)
    candidates.sort(key=lambda c: (-c[1], c[2]))
    best_id, best_depth, best_p, best_path = candidates[0]

    return RootCauseResult(
        skill_id=best_id,
        depth=best_depth,
        p_mastery=best_p,
        state=MasteryState.NOT_LEARNED if best_p < unmastered_threshold else MasteryState.PARTIAL,
        path_from_target=best_path,
    )


def find_deepest_unmastered_recursive_algorithm(
    target_skill_id: str,
    edges: list[tuple[str, str]],
    skill_states: dict[str, SkillState] | dict[str, float],
    unmastered_threshold: float = 0.40,
) -> RootCauseResult | None:
    """In-memory recursive CTE equivalent using pure adjacency lists and recursion.

    Provides exact parity with the SQL recursive CTE logic without requiring a live database.
    """
    # Adjacency: child -> list of parents (prerequisites)
    prereq_map: dict[str, list[str]] = {}
    for parent, child in edges:
        prereq_map.setdefault(child, []).append(parent)

    candidates: list[tuple[str, int, float, list[str]]] = []
    visited: set[str] = set()

    def recurse(curr: str, depth: int, path: list[str]) -> None:
        parents = prereq_map.get(curr, [])
        for p in parents:
            if p not in visited:
                visited.add(p)
                node_state = skill_states.get(p)
                if isinstance(node_state, SkillState):
                    prob = node_state.p_mastery
                elif isinstance(node_state, (int, float)):
                    prob = float(node_state)
                else:
                    prob = 0.10

                new_path = [*path, p]
                if prob < unmastered_threshold:
                    candidates.append((p, depth, prob, new_path))
                recurse(p, depth + 1, new_path)

    recurse(target_skill_id, 1, [target_skill_id])

    if not candidates:
        return None

    candidates.sort(key=lambda c: (-c[1], c[2]))
    best_id, best_depth, best_p, best_path = candidates[0]

    return RootCauseResult(
        skill_id=best_id,
        depth=best_depth,
        p_mastery=best_p,
        state=MasteryState.NOT_LEARNED if best_p < unmastered_threshold else MasteryState.PARTIAL,
        path_from_target=best_path,
    )


async def find_deepest_unmastered_sql_cte(
    session: AsyncSession,
    target_skill_id: uuid.UUID,
    student_id: uuid.UUID,
    unmastered_threshold: float = 0.40,
) -> RootCauseResult | None:
    """Execute SQL recursive CTE query to find the deepest unmastered prerequisite
    in PostgreSQL/SQLite.
    """
    query = text(
        """
        WITH RECURSIVE prereq_tree(skill_id, depth, path) AS (
            -- Anchor step: immediate prerequisites of target skill
            SELECT
                sp.parent_skill_id AS skill_id,
                1 AS depth,
                CAST(sp.parent_skill_id AS TEXT) AS path
            FROM prerequisites sp
            WHERE sp.child_skill_id = :target_skill_id

            UNION ALL

            -- Recursive step: prerequisites of prerequisites
            SELECT
                sp.parent_skill_id AS skill_id,
                pt.depth + 1 AS depth,
                pt.path || '->' || CAST(sp.parent_skill_id AS TEXT) AS path
            FROM prerequisites sp
            JOIN prereq_tree pt ON sp.child_skill_id = pt.skill_id
            WHERE pt.depth < 10
        )
        SELECT
            pt.skill_id,
            pt.depth,
            COALESCE(m.p_mastery, 0.10) AS p_mastery,
            pt.path
        FROM prereq_tree pt
        LEFT JOIN mastery m ON m.skill_id = pt.skill_id AND m.student_id = :student_id
        WHERE COALESCE(m.p_mastery, 0.10) < :threshold
        ORDER BY pt.depth DESC, p_mastery ASC
        LIMIT 1;
        """
    )

    # In SQLite, bind UUIDs as hex strings; in Postgres keep UUID object
    bind = getattr(session, "bind", None) or getattr(
        getattr(session, "sync_session", None), "bind", None
    )
    is_sqlite = bind is not None and hasattr(bind, "dialect") and bind.dialect.name == "sqlite"
    t_id: uuid.UUID | str = target_skill_id.hex if is_sqlite else target_skill_id
    s_id: uuid.UUID | str = student_id.hex if is_sqlite else student_id

    result = await session.execute(
        query,
        {
            "target_skill_id": t_id,
            "student_id": s_id,
            "threshold": unmastered_threshold,
        },
    )
    row = result.fetchone()
    if row is None:
        return None

    raw_skill_id = str(row[0])
    if len(raw_skill_id) == 32:
        try:
            skill_id_str = str(uuid.UUID(hex=raw_skill_id))
        except ValueError:
            skill_id_str = raw_skill_id
    else:
        skill_id_str = raw_skill_id

    depth = int(row[1])
    p_mastery = float(row[2])
    path_str = str(row[3])
    raw_path_tokens = path_str.split("->")
    normalized_path: list[str] = [str(target_skill_id)]
    for token in raw_path_tokens:
        clean_token = token.strip()
        if len(clean_token) == 32:
            try:
                normalized_path.append(str(uuid.UUID(hex=clean_token)))
                continue
            except ValueError:
                pass
        normalized_path.append(clean_token)

    return RootCauseResult(
        skill_id=skill_id_str,
        depth=depth,
        p_mastery=p_mastery,
        state=MasteryState.NOT_LEARNED,
        path_from_target=normalized_path,
    )
