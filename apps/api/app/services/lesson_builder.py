"""Compose a default NCERT-aligned study guide from curriculum metadata and questions."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any


def _clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _format_options(options: Sequence[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for option in options:
        text = _clean(option.get("text"))
        if not text:
            continue
        label = _clean(option.get("id"))
        lines.append(f"{label}. {text}" if label else f"- {text}")
    return lines


def _correct_answer(options: Sequence[dict[str, Any]]) -> str:
    for option in options:
        if not option.get("is_correct"):
            continue
        text = _clean(option.get("text"))
        if not text:
            continue
        label = _clean(option.get("id"))
        return f"{label}. {text}" if label else text
    return ""


def _append_question(lines: list[str], question: dict[str, Any], heading: str) -> None:
    prompt = _clean(question.get("prompt"))
    if not prompt:
        return

    lines.extend(["", heading, prompt])
    raw_options = question.get("options")
    options = raw_options if isinstance(raw_options, list) else []
    option_lines = _format_options(options)
    if option_lines:
        lines.extend(["", *option_lines])

    answer = _correct_answer(options)
    if answer:
        lines.extend(["", f"Correct answer: {answer}"])

    explanation = _clean(question.get("explanation"))
    if explanation:
        lines.extend(["", f"Why it works: {explanation}"])

    raw_hints = question.get("hints")
    hints = raw_hints if isinstance(raw_hints, list) else []
    cleaned_hints = [_clean(hint) for hint in hints[:3] if _clean(hint)]
    if cleaned_hints:
        lines.extend(["", "Hint ladder"])
        lines.extend(f"{index}. {hint}" for index, hint in enumerate(cleaned_hints, start=1))


def build_default_lesson(
    *,
    topic_name: str,
    topic_description: str | None,
    skill_name: str,
    skill_description: str,
    blooms_level: str,
    questions: Sequence[dict[str, Any]],
) -> dict[str, str]:
    """Return a title and body that can be used when no teacher lesson exists."""
    lines: list[str] = [
        f"Chapter: {topic_name}",
        "",
        "Learning outcome",
        skill_description,
    ]
    if topic_description:
        lines.extend(["", "Chapter context", topic_description])

    lines.extend(
        [
            "",
            "Concept overview",
            (
                f"This NCERT-aligned study guide builds the competency “{skill_name}”. "
                "Work through the explanation, example, and practice below, then explain the "
                "idea in your own words."
            ),
            "",
            f"Bloom's focus: {blooms_level.title()}",
        ]
    )

    if questions:
        _append_question(lines, questions[0], "Worked example")
        if len(questions) > 1:
            _append_question(lines, questions[1], "Guided practice")
    else:
        lines.extend(
            [
                "",
                "Guided practice",
                (
                    f"Write down what “{skill_name}” means, give one example from "
                    f"{topic_name}, and explain how you would check your answer."
                ),
            ]
        )

    lines.extend(
        [
            "",
            "Lesson checkpoint",
            "Can you explain the key idea without looking at the notes?",
        ]
    )
    return {"title": skill_name, "body": "\n".join(lines)}
