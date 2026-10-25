"""Simulation harness running synthetic student personas over the curriculum knowledge graph.

Runnable via:
    python -m app.engine.simulate
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.engine.bkt import clamp_probability
from app.engine.diagnostic import DiagnosticQuestionItem
from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    BKTParams,
    MasteryState,
    MasteryThresholds,
    Observation,
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker
from app.engine.root_cause import find_deepest_unmastered_networkx


@dataclass
class PersonaProfile:
    """Definition of a synthetic student learning persona."""

    name: str
    slug: str
    description: str
    true_l0: float
    true_t: float
    true_g: float
    true_s: float
    rapid_guess_rate: float
    gap_skill_codes: list[str] = field(default_factory=list)


PERSONAS: list[PersonaProfile] = [
    PersonaProfile(
        name="Fast Learner",
        slug="fast_learner",
        description="High initial knowledge and rapid concept absorption with low slips.",
        true_l0=0.65,
        true_t=0.30,
        true_g=0.20,
        true_s=0.05,
        rapid_guess_rate=0.0,
    ),
    PersonaProfile(
        name="Prerequisite Gap Student",
        slug="prerequisite_gap",
        description=(
            "Struggles with dependent skills due to an unaddressed foundational "
            "gap in Class 6/7 prerequisites."
        ),
        true_l0=0.25,
        true_t=0.10,
        true_g=0.20,
        true_s=0.15,
        rapid_guess_rate=0.05,
        gap_skill_codes=["MATH-C6-NUM-01", "MATH-C7-RAT-01"],
    ),
    PersonaProfile(
        name="Inconsistent Student",
        slug="inconsistent",
        description=(
            "Understands concepts moderately well but suffers from high slips (careless mistakes)."
        ),
        true_l0=0.35,
        true_t=0.15,
        true_g=0.20,
        true_s=0.32,
        rapid_guess_rate=0.10,
    ),
    PersonaProfile(
        name="Guesser / Anxious Student",
        slug="guesser",
        description=(
            "Frequently rushes through questions in under 3 seconds, triggering "
            "rapid-guess detection."
        ),
        true_l0=0.10,
        true_t=0.05,
        true_g=0.40,
        true_s=0.15,
        rapid_guess_rate=0.65,
    ),
]


def load_seeded_content() -> tuple[
    list[dict[str, Any]], list[tuple[str, str]], list[DiagnosticQuestionItem]
]:
    """Load seeded skills, prerequisite edges, and questions from content/class8-maths/pack.json."""
    candidates = [
        Path("content/class8-maths/pack.json"),
        Path("../../../content/class8-maths/pack.json"),
        Path(__file__).resolve().parents[4] / "content" / "class8-maths" / "pack.json",
    ]
    pack_path: Path | None = None
    for p in candidates:
        if p.exists():
            pack_path = p
            break

    if pack_path is None:
        # Fallback to in-memory mini graph if file not found
        return _fallback_content()

    with open(pack_path, encoding="utf-8") as f:
        pack = json.load(f)

    skills_data = pack.get("skills", [])
    questions_data = pack.get("questions", [])

    edges: list[tuple[str, str]] = []
    for skill in skills_data:
        child_code = skill["code"]
        for prereq in skill.get("prerequisites", []):
            parent_code = prereq["skill_code"]
            edges.append((parent_code, child_code))

    diagnostic_questions: list[DiagnosticQuestionItem] = []
    for q in questions_data:
        code = q["code"]
        skill_code = q["skill_code"]
        diff = q.get("difficulty", 3)
        diagnostic_questions.append(
            DiagnosticQuestionItem(
                question_id=code,
                code=code,
                skill_id=skill_code,
                skill_code=skill_code,
                difficulty=diff,
                question_type=q.get("question_type", "mcq"),
            )
        )

    return skills_data, edges, diagnostic_questions


def _fallback_content() -> tuple[
    list[dict[str, Any]], list[tuple[str, str]], list[DiagnosticQuestionItem]
]:
    """Minimal fallback curriculum graph for testing environments."""
    skills = [
        {"code": "MATH-C6-NUM-01", "name": "Negative Integers"},
        {"code": "MATH-C7-RAT-01", "name": "Rational Concepts"},
        {"code": "MATH-C8-RAT-01", "name": "Closure Property"},
        {"code": "MATH-C8-RAT-02", "name": "Associativity"},
    ]
    edges = [
        ("MATH-C6-NUM-01", "MATH-C7-RAT-01"),
        ("MATH-C7-RAT-01", "MATH-C8-RAT-01"),
        ("MATH-C8-RAT-01", "MATH-C8-RAT-02"),
    ]
    questions: list[DiagnosticQuestionItem] = []
    for s in skills:
        for i in range(1, 6):
            code = f"Q-{s['code']}-{i:02d}"
            questions.append(
                DiagnosticQuestionItem(
                    question_id=code,
                    code=code,
                    skill_id=s["code"],
                    skill_code=s["code"],
                    difficulty=i,
                )
            )
    return skills, edges, questions


@dataclass
class PersonaSimulationResult:
    """Outcome metrics of running a persona through the adaptive curriculum."""

    persona_name: str
    persona_slug: str
    total_questions: int
    correct_count: int
    accuracy_rate: float
    rapid_guesses_detected: int
    skills_mastered: list[str]
    skills_partial: list[str]
    skills_not_learned: list[str]
    root_cause_gaps_found: list[str]
    skip_aheads_triggered: int
    test_gates_cleared: int
    average_final_p_mastery: float
    history: list[dict[str, Any]] = field(default_factory=list)


class StudentSimulator:
    """Simulates a student interacting with the adaptive engine."""

    def __init__(self, persona: PersonaProfile, rng: random.Random) -> None:
        self.persona = persona
        self.rng = rng
        self.internal_mastery: dict[str, float] = {}

    def get_latent_mastery(self, skill_id: str, is_gap_unmastered: bool) -> float:
        """Calculate true underlying mastery probability."""
        if is_gap_unmastered and skill_id in self.persona.gap_skill_codes:
            return 0.15

        if skill_id not in self.internal_mastery:
            self.internal_mastery[skill_id] = self.persona.true_l0
        return self.internal_mastery[skill_id]

    def answer_question(
        self,
        skill_id: str,
        difficulty: int,
        is_gap_unmastered: bool,
    ) -> tuple[bool, float]:
        """Simulate student answering an item. Returns (is_correct, response_time_seconds)."""
        # Check rapid guess
        is_rapid = self.rng.random() < self.persona.rapid_guess_rate
        if is_rapid:
            time_spent = self.rng.uniform(0.8, 2.5)
            # Pure guess
            is_correct = self.rng.random() < self.persona.true_g
            return is_correct, time_spent

        time_spent = self.rng.uniform(6.0, 35.0)
        latent_p = self.get_latent_mastery(skill_id, is_gap_unmastered)

        # Success probability modulated by item difficulty: 1=easy, 5=hard
        diff_factor = 1.0 - ((difficulty - 1) * 0.08)
        p_success = (latent_p * (1.0 - self.persona.true_s) * diff_factor) + (
            (1.0 - latent_p) * self.persona.true_g
        )
        p_success = clamp_probability(p_success)

        is_correct = self.rng.random() < p_success

        # Learning transition on practice
        self.internal_mastery[skill_id] = clamp_probability(
            latent_p + ((1.0 - latent_p) * self.persona.true_t)
        )

        return is_correct, time_spent


def run_simulation(
    num_questions: int = 25,
    seed: int = 42,
) -> list[PersonaSimulationResult]:
    """Execute multi-persona simulation over the seeded Class 8 mathematics curriculum."""
    skills_data, edges, questions = load_seeded_content()
    bkt_params = BKTParams()
    thresholds = MasteryThresholds()
    mastery_machine = MasteryStateMachine(thresholds=thresholds, bkt_params=bkt_params)
    ranker = RecommendationRanker(weights=RankerWeights(), thresholds=thresholds)

    results: list[PersonaSimulationResult] = []

    # Map candidate items
    items_by_skill: dict[str, list[CandidateItem]] = {}
    for q in questions:
        c_item = CandidateItem(
            question_id=q.question_id,
            code=q.code,
            skill_id=q.skill_id,
            skill_code=q.skill_code,
            difficulty=q.difficulty,
            question_type=q.question_type,
        )
        items_by_skill.setdefault(q.skill_id, []).append(c_item)

    all_candidate_items = [item for sublist in items_by_skill.values() for item in sublist]

    for persona in PERSONAS:
        rng = random.Random(seed + hash(persona.slug))
        sim = StudentSimulator(persona, rng)

        skill_states: dict[str, SkillState] = {}
        for s in skills_data[:15]:
            code = s["code"]
            skill_states[code] = SkillState(
                skill_id=code,
                p_mastery=bkt_params.p_init,
                state=MasteryState.NOT_LEARNED,
            )

        attempted_qids: set[str] = set()
        history: list[dict[str, Any]] = []
        correct_count = 0
        rapid_guesses_detected = 0
        skip_aheads = 0
        test_gates_cleared = 0
        root_causes_found: list[str] = []

        for step in range(num_questions):
            # 1. Select next item using RecommendationRanker
            active_skills = list(skill_states.keys())
            decision = ranker.select_next_item(
                candidates=all_candidate_items,
                skill_states=skill_states,
                attempted_question_ids=attempted_qids,
                curriculum_skills=active_skills,
                edges=edges,
            )

            if decision is None:
                break

            target_skill = decision.skill_id
            if decision.is_skip_ahead:
                skip_aheads += 1
            if decision.is_test_gate:
                test_gates_cleared += 1

            # 2. Check if foundational gap is present
            is_gap_present = any(
                skill_states.get(gap, SkillState(skill_id=gap)).state != MasteryState.MASTERED
                for gap in persona.gap_skill_codes
            )

            # 3. Simulate response
            is_correct, time_spent = sim.answer_question(
                target_skill,
                decision.difficulty,
                is_gap_present,
            )

            if is_correct:
                correct_count += 1

            # 4. Record observation and update state
            obs = Observation(
                skill_id=target_skill,
                is_correct=is_correct,
                time_spent_s=time_spent,
                hint_level=decision.hint_ladder,
                question_id=decision.question_id,
            )

            if obs.is_rapid_guess:
                rapid_guesses_detected += 1

            prev_state = skill_states.get(
                target_skill, SkillState(skill_id=target_skill, p_mastery=bkt_params.p_init)
            )
            new_state = mastery_machine.process_observation(prev_state, obs)
            skill_states[target_skill] = new_state
            attempted_qids.add(decision.question_id)

            # Check root cause if student failed
            if not is_correct:
                rc = find_deepest_unmastered_networkx(
                    target_skill_id=target_skill,
                    edges=edges,
                    skill_states=skill_states,
                )
                if rc and rc.skill_id not in root_causes_found:
                    root_causes_found.append(rc.skill_id)

            history.append(
                {
                    "step": step + 1,
                    "question_code": decision.code
                    if hasattr(decision, "code")
                    else decision.question_id,
                    "skill_code": decision.skill_code,
                    "difficulty": decision.difficulty,
                    "is_correct": is_correct,
                    "time_spent_s": round(time_spent, 2),
                    "is_rapid_guess": obs.is_rapid_guess,
                    "p_mastery_after": round(new_state.p_mastery, 4),
                    "state_after": new_state.state.value,
                    "rationale": decision.rationale,
                }
            )

        # Categorize skills
        mastered = [s for s, st in skill_states.items() if st.state == MasteryState.MASTERED]
        partial = [s for s, st in skill_states.items() if st.state == MasteryState.PARTIAL]
        not_learned = [s for s, st in skill_states.items() if st.state == MasteryState.NOT_LEARNED]
        avg_p = sum(st.p_mastery for st in skill_states.values()) / max(1, len(skill_states))

        results.append(
            PersonaSimulationResult(
                persona_name=persona.name,
                persona_slug=persona.slug,
                total_questions=len(history),
                correct_count=correct_count,
                accuracy_rate=round(correct_count / max(1, len(history)), 4),
                rapid_guesses_detected=rapid_guesses_detected,
                skills_mastered=mastered,
                skills_partial=partial,
                skills_not_learned=not_learned,
                root_cause_gaps_found=root_causes_found,
                skip_aheads_triggered=skip_aheads,
                test_gates_cleared=test_gates_cleared,
                average_final_p_mastery=round(avg_p, 4),
                history=history,
            )
        )

    return results


def generate_markdown_report(results: list[PersonaSimulationResult]) -> str:
    """Format simulation results into a readable pedagogical evaluation report."""
    lines: list[str] = [
        "# BodhAI Adaptive Engine Simulation Report",
        f"Generated on: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "",
        "## Executive Summary",
        "",
        "| Persona | Questions | Accuracy | Rapid Guesses | "
        "Mastered | Partial | Not Learned | Mean P(Mastery) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for r in results:
        lines.append(
            f"| **{r.persona_name}** | {r.total_questions} | {r.accuracy_rate * 100:.1f}% | "
            f"{r.rapid_guesses_detected} | {len(r.skills_mastered)} | {len(r.skills_partial)} | "
            f"{len(r.skills_not_learned)} | {r.average_final_p_mastery:.3f} |"
        )

    lines.extend(
        [
            "",
            "## Detailed Persona Analysis",
            "",
        ]
    )

    for r in results:
        lines.extend(
            [
                f"### {r.persona_name} (`{r.persona_slug}`)",
                f"- **Questions Answered**: {r.total_questions}",
                f"- **Correct Responses**: {r.correct_count} / {r.total_questions} "
                f"({r.accuracy_rate * 100:.1f}%)",
                f"- **Rapid Guesses Flagged (< 3.0s)**: {r.rapid_guesses_detected}",
                f"- **Skip-aheads Triggered (P > 0.95)**: {r.skip_aheads_triggered}",
                f"- **Test Gates Cleared**: {r.test_gates_cleared}",
                f"- **Skills Mastered ({len(r.skills_mastered)})**: "
                f"{', '.join(r.skills_mastered) or 'None'}",
                f"- **Root Causes Identified**: {', '.join(r.root_cause_gaps_found) or 'None'}",
                "",
                "#### Sample Sequence of Adaptive Decisions",
                "| Step | Skill | Diff | Correct | Time (s) | P(Mastery) | State | Rationale |",
                "| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- |",
            ]
        )

        for h in r.history[:6]:
            c_icon = "PASS" if h["is_correct"] else "FAIL"
            short_rat = h["rationale"][:50]
            lines.append(
                f"| {h['step']} | `{h['skill_code']}` | {h['difficulty']} | {c_icon} | "
                f"{h['time_spent_s']} | {h['p_mastery_after']} | `{h['state_after']}` | "
                f"{short_rat}... |"
            )
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    """CLI entrypoint for simulation harness."""
    parser = argparse.ArgumentParser(description="Adaptive Engine Multi-Persona Simulation Harness")
    parser.add_argument("--questions", type=int, default=25, help="Questions per persona")
    parser.add_argument("--seed", type=int, default=42, help="Random generator seed")
    parser.add_argument(
        "--output-json", type=str, default="simulation_report.json", help="Path for JSON output"
    )
    parser.add_argument(
        "--output-md", type=str, default="simulation_report.md", help="Path for Markdown output"
    )
    args = parser.parse_args()

    print(
        f"Running adaptive simulation across {len(PERSONAS)} personas "
        f"({args.questions} items each)..."
    )
    results = run_simulation(num_questions=args.questions, seed=args.seed)

    # Save JSON report
    json_data = [asdict(r) for r in results]
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)
    print(f"JSON simulation metrics saved to: {args.output_json}")

    # Generate and save Markdown report
    md_content = generate_markdown_report(results)
    with open(args.output_md, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Markdown report saved to: {args.output_md}")
    print("\n" + md_content)


if __name__ == "__main__":
    main()
