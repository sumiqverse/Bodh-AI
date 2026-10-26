"""Unit tests for PII Scrubber and student privacy protection."""

from __future__ import annotations

from app.services.tutor_security import PIIScrubber


def test_pii_scrubber_email() -> None:
    """Ensure email addresses are stripped and replaced with [EMAIL]."""
    text = "My email is student.rahul@school.edu.in and parent email is parent_123@gmail.com"
    scrubbed = PIIScrubber.scrub(text)
    assert "student.rahul@school.edu.in" not in scrubbed
    assert "parent_123@gmail.com" not in scrubbed
    assert "[EMAIL]" in scrubbed
    assert PIIScrubber.contains_pii(text) is True


def test_pii_scrubber_phone_numbers() -> None:
    """Ensure Indian phone numbers (with +91, 0, or spaces) are scrubbed."""
    samples = [
        "Call me at +91 9876543210 please",
        "Phone: 09876543210",
        "My mobile number is 98765-43210",
        "Contact: +91-8765432109",
    ]
    for sample in samples:
        scrubbed = PIIScrubber.scrub(sample)
        assert "9876543210" not in scrubbed
        assert "8765432109" not in scrubbed
        assert "[PHONE]" in scrubbed
        assert PIIScrubber.contains_pii(sample) is True


def test_pii_scrubber_aadhaar() -> None:
    """Ensure 12-digit Indian Aadhaar numbers in 4-4-4 format or prefixed are scrubbed."""
    text1 = "Student Aadhaar is 2345 6789 0123 for scholarship verification"
    scrubbed1 = PIIScrubber.scrub(text1)
    assert "2345 6789 0123" not in scrubbed1
    assert "[AADHAAR]" in scrubbed1
    assert PIIScrubber.contains_pii(text1) is True

    text2 = "aadhaar: 987654321098 please verify"
    scrubbed2 = PIIScrubber.scrub(text2)
    assert "987654321098" not in scrubbed2
    assert "[AADHAAR]" in scrubbed2


def test_pii_scrubber_roll_numbers() -> None:
    """Ensure student roll numbers are pseudonomized."""
    samples = [
        "I am in class 7, Roll No: 42A",
        "Roll number 18 is asking for help",
        "Roll 7B here",
    ]
    for sample in samples:
        scrubbed = PIIScrubber.scrub(sample)
        assert "[ROLL_NUMBER]" in scrubbed
        assert PIIScrubber.contains_pii(sample) is True


def test_pii_scrubber_student_names() -> None:
    """Ensure self-introduction and name disclosures are scrubbed."""
    text1 = "Hello, my name is Rahul Sharma and I do not understand fractions"
    scrubbed1 = PIIScrubber.scrub(text1)
    assert "Rahul Sharma" not in scrubbed1
    assert "[STUDENT_NAME]" in scrubbed1

    text2 = "I am Priya Patel from section B"
    scrubbed2 = PIIScrubber.scrub(text2)
    assert "Priya Patel" not in scrubbed2
    assert "[STUDENT_NAME]" in scrubbed2


def test_pii_scrubber_ip_address() -> None:
    """Ensure IP addresses are scrubbed."""
    text = "Client connected from 192.168.1.105 with query"
    scrubbed = PIIScrubber.scrub(text)
    assert "192.168.1.105" not in scrubbed
    assert "[IP_ADDRESS]" in scrubbed


def test_pii_scrubber_clean_academic_text() -> None:
    """Ensure normal academic queries without PII are unmodified."""
    text = "Why is (-3) + (-5) equal to -8 in integer arithmetic?"
    scrubbed = PIIScrubber.scrub(text)
    assert scrubbed == text
    assert PIIScrubber.contains_pii(text) is False


def test_pii_scrubber_empty_input() -> None:
    """Ensure empty or whitespace input is handled safely."""
    assert PIIScrubber.scrub("") == ""
    assert PIIScrubber.contains_pii("") is False
