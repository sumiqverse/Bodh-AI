"""Curriculum resolution utilities mapping classes and subjects to official NCERT codes."""

from __future__ import annotations


def resolve_curriculum_code(grade: int | None, class_name: str | None) -> str:
    """Map a class grade and class name/subject string to an official NCERT curriculum code.

    Examples:
        resolve_curriculum_code(7, "english") -> "NCERT-ENGL-C7"
        resolve_curriculum_code(8, "Class 8-A Mathematics") -> "NCERT-MATH-C8"
        resolve_curriculum_code(9, "Class 9-B Science") -> "NCERT-SCIE-C9"
        resolve_curriculum_code(7, "Class 7-C Social Science") -> "NCERT-SOCI-C7"
        resolve_curriculum_code(6, "Hindi") -> "NCERT-HIND-C6"
    """
    name_lower = (class_name or "").lower()
    if "engl" in name_lower:
        subj = "ENGL"
    elif any(
        s in name_lower for s in ["scie", "sci", "physics", "chem", "bio", "vigyan", "science"]
    ):
        subj = "SCIE"
    elif any(
        s in name_lower
        for s in ["soci", "sst", "history", "civics", "geography", "samajik", "social"]
    ):
        subj = "SOCI"
    elif "hind" in name_lower:
        subj = "HIND"
    else:
        subj = "MATH"

    g = max(6, min(10, grade if grade is not None else 8))
    return f"NCERT-{subj}-C{g}"
