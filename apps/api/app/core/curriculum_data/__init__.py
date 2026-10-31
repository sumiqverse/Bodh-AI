"""Master NCERT Curriculum Data Package for Classes 6 to 10."""

from app.core.curriculum_data.grade_6 import GRADE_6_CURRICULUM
from app.core.curriculum_data.grade_7 import GRADE_7_CURRICULUM
from app.core.curriculum_data.grade_8 import GRADE_8_CURRICULUM
from app.core.curriculum_data.grade_9 import GRADE_9_CURRICULUM
from app.core.curriculum_data.grade_10 import GRADE_10_CURRICULUM

NCERT_DATA: dict[
    int, dict[str, list[tuple[str, str, str, list[tuple[str, str, str, float, str]]]]]
] = {
    6: GRADE_6_CURRICULUM,
    7: GRADE_7_CURRICULUM,
    8: GRADE_8_CURRICULUM,
    9: GRADE_9_CURRICULUM,
    10: GRADE_10_CURRICULUM,
}

__all__ = [
    "GRADE_6_CURRICULUM",
    "GRADE_7_CURRICULUM",
    "GRADE_8_CURRICULUM",
    "GRADE_9_CURRICULUM",
    "GRADE_10_CURRICULUM",
    "NCERT_DATA",
]
