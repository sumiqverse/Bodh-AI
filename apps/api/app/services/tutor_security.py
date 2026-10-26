"""AI Tutor safety guardrails: PII scrubbing, prompt injection defense, and test-mode protection."""

from __future__ import annotations

import html
import re
from typing import Any

# --- Regex Patterns for PII Detection and Scrubbing ---
# Emails
EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    re.IGNORECASE,
)

# Indian 10-digit mobile phone numbers with optional country code (+91, 0)
PHONE_REGEX = re.compile(r"(?:\+91[\s-]?)?(?:0)?[6-9]\d{4}[\s-]?\d{5}\b")

# Indian Aadhaar 12-digit number (4-4-4 format or prefixed with aadhaar/uid or raw 12 digits)
AADHAAR_REGEX = re.compile(
    r"\b[2-9]\d{3}\s\d{4}\s\d{4}\b|\b(?:aadhaar|uid)[:\s]*\d{12}\b|\b[2-9]\d{11}\b",
    re.IGNORECASE,
)

# Roll numbers (e.g., "Roll No: 15", "Roll 24", "Roll number 8B")
ROLL_REGEX = re.compile(r"(?i)\b(?:roll\s*(?:no\.?|number)?\s*[:=-]?\s*)([A-Za-z0-9_-]+)\b")

# Self-introduction / name disclosure patterns (e.g., "My name is Rahul Sharma", "I am Priya")
NAME_INTRO_REGEX = re.compile(
    r"(?i)\b(?:my\s+name\s+is|i\s+am|this\s+is|student\s*name\s*[:=-]?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
)

# IPv4 Addresses
IP_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

# --- Prompt Injection Signatures ---
INJECTION_SIGNATURES = [
    re.compile(
        r"ignore\s+(?:all\s+)?(?:previous\s+)?(?:instructions|guidelines|rules|prompts)",
        re.IGNORECASE,
    ),
    re.compile(
        r"disregard\s+(?:all\s+)?(?:previous\s+)?(?:instructions|guidelines|rules|prompts)",
        re.IGNORECASE,
    ),
    re.compile(
        r"you\s+are\s+now\s+(?:in\s+)?(?:developer|god|unrestricted|jailbreak|dan)(?:\s+mode)?",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:print|output|display|show|reveal|repeat)\s+(?:the\s+)?(?:system\s+prompt|developer\s+instructions|initial\s+prompt|secret)",
        re.IGNORECASE,
    ),
    re.compile(r"<\s*\|\s*(?:im_start|im_end|system)\s*\|\s*>", re.IGNORECASE),
    re.compile(
        r"\[\s*INST\s*\]|\[\s*/\s*INST\s*\]|<<SYS>>|<</SYS>>|\[ADMIN\s+OVERRIDE\]|</instruction>",
        re.IGNORECASE,
    ),
    re.compile(r"act\s+as\s+(?:an?\s+)?(?:unrestricted\s+ai|evil\s+scientist)", re.IGNORECASE),
    re.compile(r"system\s*:\s*you\s+are", re.IGNORECASE),
    re.compile(r"bypass\s+(?:safety|content\s+filter|guardrails|rules)", re.IGNORECASE),
    re.compile(
        r"(?:निर्देश\s+भूल\s+जाओ|प्रणाली\s+की\s+गुप्त|सिस्टम\s+प्रॉम्प्ट|आंतरिक\s+प्रणाली)", re.IGNORECASE
    ),
]

# --- Inappropriate / Off-Topic Signatures ---
INAPPROPRIATE_KEYWORDS = [
    "hack",
    "exploit",
    "kill",
    "suicide",
    "bomb",
    "weapon",
    "drugs",
    "porn",
    "sex",
    "nudity",
    "gambling",
    "crypto",
    "casino",
    "betting",
    "murder",
    "terrorist",
    "explosive",
    "explosives",
    "poison",
]

OFF_TOPIC_PATTERNS = [
    re.compile(
        r"\b(?:cricket|football|ipl|messi|ronaldo|fifa|minecraft|roblox|fortnite|gta|pubg)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:movie|actor|bollywood|hollywood|song|lyrics|rap|girlfriend|boyfriend|dating)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:politics|election|modi|rahul\s+gandhi|bjp|congress|parliament)\b", re.IGNORECASE
    ),
    re.compile(
        r"\b(?:stock\s+market|stock\s+price|stocks?|shares?|tesla|apple|bitcoin|trading|ethereum|make\s+money\s+online)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:recipe|cook|cookies?|cake|baking|restaurant)\b", re.IGNORECASE),
    re.compile(r"\b(?:फिल्म|सिनेमा|गाना|क्रिकेट|मैच|गाना|शायरी)\b", re.IGNORECASE),
]


class PIIScrubber:
    """Scrubs personally identifiable information (PII) before transmission or logging."""

    @classmethod
    def scrub(cls, text: str) -> str:
        """Replace all detected PII with standardized privacy pseudonyms."""
        if not text:
            return ""

        scrubbed = text

        # 1. Scrub Emails
        scrubbed = EMAIL_REGEX.sub("[EMAIL]", scrubbed)

        # 2. Scrub Aadhaar Numbers before phone numbers to prevent prefix overlap
        scrubbed = AADHAAR_REGEX.sub("[AADHAAR]", scrubbed)

        # 3. Scrub Indian Phone Numbers
        scrubbed = PHONE_REGEX.sub("[PHONE]", scrubbed)

        # 4. Scrub Roll Numbers
        scrubbed = ROLL_REGEX.sub("Roll [ROLL_NUMBER]", scrubbed)

        # 5. Scrub Name Introductions
        scrubbed = NAME_INTRO_REGEX.sub(r"I am [STUDENT_NAME]", scrubbed)

        # 6. Scrub IP addresses
        scrubbed = IP_REGEX.sub("[IP_ADDRESS]", scrubbed)

        return scrubbed

    @classmethod
    def contains_pii(cls, text: str) -> bool:
        """Return True if any PII pattern is identified in raw text."""
        if not text:
            return False
        return any(
            pattern.search(text) is not None
            for pattern in (
                EMAIL_REGEX,
                PHONE_REGEX,
                AADHAAR_REGEX,
                ROLL_REGEX,
                NAME_INTRO_REGEX,
                IP_REGEX,
            )
        )


class PromptInjectionDefender:
    """Detects and sanitizes adversarial prompt injection attempts from student input."""

    @classmethod
    def detect_injection(cls, text: str) -> bool:
        """Scan input against prompt injection signatures."""
        if not text:
            return False
        return any(pattern.search(text) is not None for pattern in INJECTION_SIGNATURES)

    @classmethod
    def sanitize_input(cls, text: str) -> str:
        """Neutralize delimiter manipulation and wrap student input as pure data."""
        if not text:
            return ""

        # Remove control tokens and fake delimiters
        cleaned = re.sub(
            r"<\s*/?\s*(?:system|assistant|prompt|instruction)\s*>", "", text, flags=re.IGNORECASE
        )
        cleaned = re.sub(
            r"\[\s*/?\s*INST\s*\]|<<\s*/?\s*SYS\s*>>", "", cleaned, flags=re.IGNORECASE
        )
        cleaned = re.sub(r"<\s*\|\s*im_(?:start|end)\s*\|\s*>", "", cleaned, flags=re.IGNORECASE)

        # Escape HTML tags
        cleaned = html.escape(cleaned.strip())

        # Return safely wrapped in data tag
        return f"<student_query>\n{cleaned}\n</student_query>"

    @classmethod
    def validate_output(cls, output: str, canary_token: str | None = None) -> bool:
        """Verify output does not reflect system instructions or leak canary token."""
        if not output:
            return True
        if canary_token and canary_token in output:
            return False
        # Prevent output leaking prompt delimiters
        return not ("<student_query>" in output or "</student_query>" in output)


class ContentSafetyFilter:
    """Filters inappropriate content and politely refuses off-topic requests."""

    @classmethod
    def check_content(cls, text: str, language: str = "en") -> tuple[bool, str | None]:
        """Check for inappropriate language or off-topic queries."""
        if not text:
            return True, None

        lower = text.lower()

        # Check inappropriate keywords
        for kw in INAPPROPRIATE_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                msg = (
                    "I am BodhAI, your academic learning assistant. "
                    "I can only help with safe school curriculum concepts."
                    if language == "en"
                    else (
                        "मैं बोधAI, आपका शैक्षणिक शिक्षण सहायक हूँ। "
                        "मैं केवल सुरक्षित विद्यालयी पाठ्यक्रम अवधारणाओं में सहायता कर सकता हूँ।"
                    )
                )
                return False, msg

        # Check off-topic patterns
        for pattern in OFF_TOPIC_PATTERNS:
            if pattern.search(lower):
                msg = (
                    "I am your BodhAI curriculum tutor for Classes 6 to 10. "
                    "I can only assist with mathematics and science concepts from your syllabus."
                    if language == "en"
                    else (
                        "मैं कक्षा 6 से 10 के लिए आपका बोधAI पाठ्यक्रम सहायक हूँ। "
                        "मैं केवल आपके पाठ्यक्रम के गणित और विज्ञान विषयों में सहायता कर सकता हूँ।"
                    )
                )
                return False, msg

        return True, None


class TestModeProtector:
    """Enforces strict hint-free test-mode protections to eliminate answer leakage."""

    @classmethod
    def is_answer_revealed(
        cls,
        text: str,
        canonical_answer: str | None,
        options: list[dict[str, Any]] | None = None,
    ) -> bool:
        """Check if output gives away the exact answer or correct option letter."""
        if not text or not canonical_answer:
            return False

        lower_out = text.lower()
        lower_ans = canonical_answer.strip().lower()

        # Direct answer match
        if len(lower_ans) > 1 and lower_ans in lower_out:
            return True

        # Check option letters (e.g., "The answer is option A", "Select (B)")
        if options:
            for opt in options:
                if opt.get("is_correct"):
                    opt_id = str(opt.get("id", "")).strip().lower()
                    opt_text = str(opt.get("text", "")).strip().lower()

                    if re.search(
                        rf"(?:option|answer|choice|select)\s*(?:is|[:=-])?\s*\(?{re.escape(opt_id)}\)?",
                        lower_out,
                    ):
                        return True
                    if len(opt_text) > 2 and opt_text in lower_out:
                        return True

        return False

    @classmethod
    def get_test_mode_refusal(cls, language: str = "en") -> str:
        """Return clear, calm, shaming-free refusal for test mode."""
        if language == "hi":
            return (
                "आप वर्तमान में एक स्वतंत्र मूल्यांकन (Test Mode) दे रहे हैं। "
                "परीक्षा के दौरान उत्तर या संकेत प्रदान नहीं किए जा सकते। "
                "कृपया अपने ज्ञान के आधार पर सर्वोत्तम उत्तर दें!"
            )
        return (
            "You are currently taking an active assessment (Test Mode). "
            "Direct answers and hints are disabled during tests. "
            "Please do your best based on what you have learned!"
        )
