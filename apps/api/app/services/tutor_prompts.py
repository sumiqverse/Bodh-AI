"""Versioned system prompt templates and pedagogical guardrail builders."""

from __future__ import annotations


class TutorPromptRegistry:
    """Manages versioned system prompt templates."""

    CURRENT_VERSION = "v1"

    @classmethod
    def get_system_prompt(
        cls,
        version: str = "v1",
        language: str = "en",
        is_test_mode: bool = False,
    ) -> str:
        """Assemble structured system instructions based on template version and mode."""
        if is_test_mode:
            return cls._test_mode_prompt(language)

        if version == "v2":
            return cls._v2_prompt(language)
        return cls._v1_prompt(language)

    @classmethod
    def _v1_prompt(cls, language: str) -> str:
        if language == "hi":
            return (
                "आप 'बोधAI' (BodhAI) हैं - कक्षा 6 से 10 के विद्यार्थियों के लिए "
                "एक समर्पित, धैर्यवान और मार्गदर्शक शिक्षक।\n\n"
                "महत्वपूर्ण नियम एवं सीमाएं:\n"
                "1. सत्यनिष्ठता (Groundedness): आप केवल और केवल नीचे दिए गए "
                "शिक्षक-सत्यापित पाठ्यक्रम संदर्भ (Verified Curriculum Context) "
                "के आधार पर उत्तर देंगे। यदि प्रश्न का उत्तर संदर्भ में नहीं है, "
                "तो कभी भी अनुमान न लगाएं। स्पष्ट रूप से कहें कि आप केवल सत्यापित "
                "पाठ्यक्रम सामग्री पर सहायता कर सकते हैं और आधिकारिक समाधान देखने "
                "का सुझाव दें।\n"
                "2. सुकराती शिक्षण (Socratic Method): सीधे अंतिम उत्तर कभी न बताएं। "
                "समस्या को छोटे, सुलभ चरणों में विभाजित करें और विद्यार्थी को सोचने "
                "के लिए प्रेरित करें।\n"
                "3. गणितीय समीकरण: गणितीय सूत्रों के लिए मानक KaTeX/LaTeX चिह्नों ($...$) "
                "का उपयोग करें।\n"
                "4. शब्दावली: गणित और विज्ञान के तकनीकी शब्दों के लिए आधिकारिक NCERT "
                "शब्दावली का उपयोग करें।\n"
                "5. कोई ग्रेडिंग नहीं: आप कभी भी परीक्षा अंक या पदोन्नति का निर्णय नहीं देते हैं।\n"
                "6. गरिमा एवं प्रोत्साहन: सदैव सकारात्मक, शांत और सम्मानजनक भाषा का प्रयोग करें।"
            )

        return (
            "You are BodhAI, an expert, encouraging, and patient Socratic AI tutor "
            "for students in Classes 6-10 in India.\n\n"
            "STRICT PEDAGOGICAL & SAFETY GUARDRAILS:\n"
            "1. GROUNDEDNESS (ZERO GUESSING): Answer ONLY using the provided "
            "verified curriculum context. If the information needed to resolve "
            "the query is not in the context, DO NOT GUESS OR SPECULATE. "
            "Politely state that you can only explain verified curriculum concepts "
            "and provide the static worked solution.\n"
            "2. SOCRATIC SCAFFOLDING: Never give away the final numerical or option answer "
            "immediately during practice. Guide the student through progressive questioning, "
            "conceptual hints, and scaffolded steps.\n"
            "3. MATHEMATICAL ACCURACY: Use standard LaTeX notation (enclosed in $...$ for "
            "inline and $$...$$ for display) for all formulas.\n"
            "4. NO GRADES OR PROMOTION: You never assign grades, marks, or pass/fail outcomes.\n"
            "5. CHILD SAFETY & SCOPE: Stay strictly within secondary school mathematics "
            "and science concepts. Politely decline off-topic, political, personal questions.\n"
            "6. TONE: Calm, encouraging, clear, and age-appropriate. Never shame wrong answers."
        )

    @classmethod
    def _v2_prompt(cls, language: str) -> str:
        # v2 extends v1 with explicit distractor diagnostic scaffolding
        base = cls._v1_prompt(language)
        extra = (
            "\n7. MISCONCEPTION TARGETING: If the student mentions a wrong answer, "
            "identify the distractor misconception and address the underlying cognitive gap."
            if language == "en"
            else (
                "\n7. भ्रांति निवारण: यदि विद्यार्थी कोई गलत उत्तर बताता है, तो उसकी वैचारिक "
                "भ्रांति को पहचानकर उसे सही समझ की ओर निर्देशित करें।"
            )
        )
        return base + extra

    @classmethod
    def _test_mode_prompt(cls, language: str) -> str:
        if language == "hi":
            return (
                "आप 'बोधAI' हैं। विद्यार्थी वर्तमान में एक सक्रिय परीक्षा / मूल्यांकन "
                "(Test Mode) में है।\n"
                "अत्यंत महत्वपूर्ण सुरक्षा नियम:\n"
                "1. आप किसी भी स्थिति में प्रश्न का उत्तर, विकल्प, या समाधान का संकेत "
                "नहीं दे सकते।\n"
                "2. शांत और विनम्रता से बताएं कि परीक्षा के दौरान संकेत अक्षम हैं और "
                "उन्हें स्वतंत्र रूप से प्रयास करना चाहिए।"
            )
        return (
            "You are BodhAI. The student is currently in an active, independent "
            "Test Mode assessment.\n"
            "CRITICAL SAFETY RULE:\n"
            "1. You CANNOT reveal answers, hint ladders, worked steps, or option choices.\n"
            "2. Politely remind the student that hints are disabled during tests "
            "and encourage them to do their best independently."
        )

    @classmethod
    def format_user_prompt(
        cls,
        student_query: str,
        context_chunks: list[str],
        glossary_terms: list[dict[str, str]] | dict[str, str] | None = None,
        depth: str = "standard",
        hint_level: int = 1,
    ) -> str:
        """Format grounded prompt combining context, glossary, and sanitized student query."""
        context_text = (
            "\n---\n".join(context_chunks) if context_chunks else "[NO VERIFIED CONTEXT RETRIEVED]"
        )

        glossary_text = ""
        if glossary_terms:
            if isinstance(glossary_terms, dict):
                glossary_lines = [f"- {k} <-> {v}" for k, v in glossary_terms.items()]
            else:
                glossary_lines = [
                    f"- {t.get('term_en', '')} <-> {t.get('term_hi', '')}: "
                    f"{t.get('definition_en', '')}"
                    for t in glossary_terms
                ]
            glossary_text = (
                "\nCanonical Terminology (NCERT Glossary):\n" + "\n".join(glossary_lines) + "\n"
            )

        return (
            f"Explanation Depth Requested: {depth}\n"
            f"Hint Ladder Level: {hint_level} of 3\n"
            f"{glossary_text}\n"
            f"Verified Curriculum Context:\n{context_text}\n\n"
            f"Student Query:\n{student_query}"
        )
