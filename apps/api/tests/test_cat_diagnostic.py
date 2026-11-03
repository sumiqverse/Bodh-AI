"""Unit tests for CAT-style diagnostic engine: EIG and stopping rules."""

import pytest

from app.engine.diagnostic import (
    CATDiagnosticEngine,
    DiagnosticQuestionItem,
)
from app.engine.models import (
    DiagnosticConfig,
)


@pytest.fixture
def diagnostic_setup() -> tuple[list[tuple[str, str]], list[DiagnosticQuestionItem]]:
    """Build prerequisite graph and question items for testing."""
    edges = [
        ("SKILL-PREREQ", "SKILL-TARGET"),
    ]
    questions = []
    # 10 questions for SKILL-PREREQ
    for i in range(1, 11):
        questions.append(
            DiagnosticQuestionItem(
                question_id=f"Q-P-{i:02d}",
                code=f"Q-P-{i:02d}",
                skill_id="SKILL-PREREQ",
                skill_code="SKILL-PREREQ",
                difficulty=min(5, (i % 5) + 1),
            )
        )
    # 15 questions for SKILL-TARGET
    for i in range(1, 16):
        questions.append(
            DiagnosticQuestionItem(
                question_id=f"Q-T-{i:02d}",
                code=f"Q-T-{i:02d}",
                skill_id="SKILL-TARGET",
                skill_code="SKILL-TARGET",
                difficulty=min(5, (i % 5) + 1),
            )
        )
    return edges, questions


def test_cat_session_start_and_first_decision(
    diagnostic_setup: tuple[list[tuple[str, str]], list[DiagnosticQuestionItem]],
) -> None:
    """Session initializes with prior knowledge states and picks item maximizing EIG."""
    edges, questions = diagnostic_setup
    engine = CATDiagnosticEngine(edges=edges, questions=questions)
    session = engine.start_session("student-123")

    assert session.student_id == "student-123"
    assert session.questions_answered == 0
    assert not session.is_completed

    decision = engine.pick_next_item(session)
    assert not decision.is_completed
    assert decision.item is not None
    assert decision.expected_information_gain > 0.0
    assert "Expected Information Gain" in decision.rationale


def test_backward_prerequisite_walking_on_failure(
    diagnostic_setup: tuple[list[tuple[str, str]], list[DiagnosticQuestionItem]],
) -> None:
    """When a student fails on a skill, the engine walks backward to test its prerequisite."""
    edges, questions = diagnostic_setup
    engine = CATDiagnosticEngine(edges=edges, questions=questions)
    session = engine.start_session("student-456")

    # Student answers a question on SKILL-TARGET and fails
    target_q = next(q for q in questions if q.skill_id == "SKILL-TARGET")
    engine.record_response(
        session=session,
        question_id=target_q.question_id,
        is_correct=False,
        time_spent_s=15.0,
    )

    # Next item MUST walk backward to test SKILL-PREREQ
    decision = engine.pick_next_item(session)
    assert not decision.is_completed
    assert decision.item is not None
    assert decision.item.skill_id == "SKILL-PREREQ"
    assert "Diagnostic backward walk" in decision.rationale
    assert "SKILL-PREREQ" in session.root_cause_gaps


def test_cat_stopping_rules(
    diagnostic_setup: tuple[list[tuple[str, str]], list[DiagnosticQuestionItem]],
) -> None:
    """Session stops when questions reach max_questions or uncertainty drops below threshold."""
    edges, questions = diagnostic_setup

    # Case A: Stops when uncertainty drops below threshold (min_questions=5, threshold=0.15)
    config_a = DiagnosticConfig(min_questions=5, max_questions=15, uncertainty_threshold=0.15)
    engine_a = CATDiagnosticEngine(edges=edges, questions=questions, config=config_a)
    session_a = engine_a.start_session("student-uncert")

    stopped_early = False
    for _i in range(15):
        dec = engine_a.pick_next_item(session_a)
        if dec.is_completed:
            stopped_early = True
            assert "dropped below threshold" in dec.rationale
            break
        assert dec.item is not None
        engine_a.record_response(
            session=session_a,
            question_id=dec.item.question_id,
            is_correct=True,
            time_spent_s=12.0,
        )

    assert stopped_early is True
    assert 5 <= session_a.questions_answered < 15

    # Case B: Stops strictly on max_questions (uncertainty_threshold set to 0.0)
    config_b = DiagnosticConfig(min_questions=5, max_questions=7, uncertainty_threshold=0.0)
    engine_b = CATDiagnosticEngine(edges=edges, questions=questions, config=config_b)
    session_b = engine_b.start_session("student-max")

    for _ in range(7):
        dec = engine_b.pick_next_item(session_b)
        assert dec.item is not None
        engine_b.record_response(
            session=session_b,
            question_id=dec.item.question_id,
            is_correct=True,
            time_spent_s=12.0,
        )

    dec_final = engine_b.pick_next_item(session_b)
    assert dec_final.is_completed is True
    assert "Maximum diagnostic length reached" in dec_final.rationale
    summary = engine_b.generate_summary(session_b)
    assert summary.total_questions == 7
    assert summary.session_id == session_b.session_id


def test_final_five_prioritize_weaker_observed_skills(
    diagnostic_setup: tuple[list[tuple[str, str]], list[DiagnosticQuestionItem]],
) -> None:
    edges, questions = diagnostic_setup
    engine = CATDiagnosticEngine(
        edges,
        questions,
        config=DiagnosticConfig(min_questions=20, max_questions=20, targeted_followup_after=15),
    )
    session = engine.start_session("student")
    session.questions_answered = 15
    session.skill_states["SKILL-PREREQ"].observations_count = 3
    session.skill_states["SKILL-PREREQ"].p_mastery = 0.2
    session.skill_states["SKILL-TARGET"].observations_count = 3
    session.skill_states["SKILL-TARGET"].p_mastery = 0.8
    decision = engine.pick_next_item(session)
    assert decision.item is not None
    assert decision.item.skill_id == "SKILL-PREREQ"
    assert "lower mastery" in decision.rationale
