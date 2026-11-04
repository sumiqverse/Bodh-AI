"""Compose a default NCERT-aligned study guide from curriculum metadata and questions."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

_LESSON_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "chapter": "Chapter",
        "learning_outcome": "Learning outcome",
        "chapter_context": "Chapter context",
        "concept_overview": "Concept overview",
        "concept": (
            "This NCERT-aligned study guide builds the competency “{skill_name}”. "
            "Work through the explanation, example, and practice below, then explain the "
            "idea in your own words."
        ),
        "blooms_focus": "Bloom's focus",
        "worked_example": "Worked example",
        "guided_practice": "Guided practice",
        "correct_answer": "Correct answer",
        "why_it_works": "Why it works",
        "hint_ladder": "Hint ladder",
        "no_questions": (
            "Write down what “{skill_name}” means, give one example from "
            "{topic_name}, and explain how you would check your answer."
        ),
        "lesson_checkpoint": "Lesson checkpoint",
        "checkpoint_question": "Can you explain the key idea without looking at the notes?",
    },
    "hi": {
        "chapter": "अध्याय",
        "learning_outcome": "सीखने का लक्ष्य",
        "chapter_context": "अध्याय का संदर्भ",
        "concept_overview": "अवधारणा का अवलोकन",
        "concept": (
            "यह NCERT-संरेखित अध्ययन मार्गदर्शिका “{skill_name}” क्षमता विकसित करती है। "
            "नीचे दिए गए स्पष्टीकरण, उदाहरण और अभ्यास को पूरा करें, फिर इस विचार को "
            "अपने शब्दों में समझाएँ।"
        ),
        "blooms_focus": "ब्लूम का केंद्र",
        "worked_example": "हल किया गया उदाहरण",
        "guided_practice": "निर्देशित अभ्यास",
        "correct_answer": "सही उत्तर",
        "why_it_works": "यह क्यों सही है",
        "hint_ladder": "संकेत श्रृंखला",
        "no_questions": (
            "“{skill_name}” का अर्थ लिखें, {topic_name} से एक उदाहरण दें और बताएँ कि "
            "आप अपने उत्तर की जाँच कैसे करेंगे।"
        ),
        "lesson_checkpoint": "पाठ की जाँच",
        "checkpoint_question": "क्या आप नोट्स देखे बिना मुख्य विचार समझा सकते हैं?",
    },
}


def _lesson_strings(language: str) -> dict[str, str]:
    return _LESSON_STRINGS["hi"] if language.lower().startswith("hi") else _LESSON_STRINGS["en"]


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


def _append_question(
    lines: list[str],
    question: dict[str, Any],
    heading: str,
    labels: dict[str, str],
) -> None:
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
        lines.extend(["", f"{labels['correct_answer']}: {answer}"])

    explanation = _clean(question.get("explanation"))
    if explanation:
        lines.extend(["", f"{labels['why_it_works']}: {explanation}"])

    raw_hints = question.get("hints")
    hints = raw_hints if isinstance(raw_hints, list) else []
    cleaned_hints = [_clean(hint) for hint in hints[:3] if _clean(hint)]
    if cleaned_hints:
        lines.extend(["", labels["hint_ladder"]])
        lines.extend(f"{index}. {hint}" for index, hint in enumerate(cleaned_hints, start=1))


def build_default_lesson(
    *,
    topic_name: str,
    topic_description: str | None,
    skill_name: str,
    skill_description: str,
    blooms_level: str,
    questions: Sequence[dict[str, Any]],
    language: str = "en",
) -> dict[str, str]:
    """Return a title and body that can be used when no teacher lesson exists."""
    labels = _lesson_strings(language)
    lines: list[str] = [
        f"{labels['chapter']}: {topic_name}",
        "",
        labels["learning_outcome"],
        skill_description,
    ]
    if topic_description:
        lines.extend(["", labels["chapter_context"], topic_description])

    lines.extend(
        [
            "",
            labels["concept_overview"],
            labels["concept"].format(skill_name=skill_name),
            "",
            f"{labels['blooms_focus']}: {blooms_level.title()}",
        ]
    )

    if questions:
        _append_question(lines, questions[0], labels["worked_example"], labels)
        if len(questions) > 1:
            _append_question(lines, questions[1], labels["guided_practice"], labels)
    else:
        lines.extend(
            [
                "",
                labels["guided_practice"],
                labels["no_questions"].format(skill_name=skill_name, topic_name=topic_name),
            ]
        )

    lines.extend(
        [
            "",
            labels["lesson_checkpoint"],
            labels["checkpoint_question"],
        ]
    )
    return {"title": skill_name, "body": "\n".join(lines)}
