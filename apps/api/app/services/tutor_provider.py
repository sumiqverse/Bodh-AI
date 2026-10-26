"""LLM and embedding provider abstraction layer with vendor pluggability."""

from __future__ import annotations

import hashlib
import math
from abc import ABC, abstractmethod
from typing import Any, ClassVar

import httpx

from app.core.config import Settings


class LLMProvider(ABC):
    """Abstract interface for LLM vendors (OpenAI, Mock, Anthropic, Bedrock)."""

    @abstractmethod
    async def generate_chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 600,
    ) -> tuple[str, int, float]:
        """Generate structured chat completion.

        Returns:
            Tuple of (response_text, tokens_used, estimated_cost_usd).
        """
        ...

    @abstractmethod
    async def get_embedding(self, text: str) -> list[float]:
        """Compute dense vector embedding for single text chunk."""
        ...

    @abstractmethod
    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Compute batch embeddings."""
        ...


class MockLLMProvider(LLMProvider):
    """Deterministic, offline-resilient mock provider for unit tests and local development."""

    DIMENSION = 384

    def __init__(self, should_fail: bool = False) -> None:
        self.should_fail = should_fail

    _SEMANTIC_DOMAINS: ClassVar[dict[str, list[str]]] = {
        "integer": [
            "integer",
            "integers",
            "negative",
            "positive",
            "sign",
            "पूर्णांक",
            "ऋणात्मक",
            "धनात्मक",
        ],
        "fraction": [
            "fraction",
            "fractions",
            "denominator",
            "numerator",
            "lcm",
            "भिन्न",
            "हर",
            "ल.स.प",
        ],
        "equation": ["equation", "variable", "linear", "isolate", "रैखिक", "समीकरण", "चर"],
        "ratio": ["ratio", "proportion", "unitary", "अनुपात", "समानुपात", "pencil"],
        "percent": ["percent", "percentage", "प्रतिशत"],
        "exponent": ["exponent", "power", "घात", "घातांक"],
        "angles": [
            "angle",
            "angles",
            "triangle",
            "triangles",
            "कोण",
            "त्रिभुज",
            "degree",
            "शीर्षाभिमुख",
        ],
        "pythagoras": ["pythagor", "hypotenuse", "पाइथागोरस", "कर्ण"],
        "statistics": ["mean", "median", "frequency", "माध्य"],
        "probability": ["probability", "favorable", "प्रायिकता"],
        "photosynthesis": ["photosynthesis", "chlorophyll", "solar", "प्रकाश संश्लेषण", "क्लोरोफिल"],
        "respiration": ["respiration", "aerobic", "anaerobic", "श्वसन"],
        "newton": [
            "newton",
            "motion",
            "inertia",
            "force",
            "न्यूटन",
            "गति",
            "जड़त्व",
            "क्रिया",
            "प्रतिक्रिया",
            "नियम",
        ],
        "energy": ["energy", "potential", "kinetic", "ऊर्जा"],
        "acids": [
            "acid",
            "acids",
            "base",
            "bases",
            "litmus",
            "neutralization",
            "अम्ल",
            "क्षार",
            "उदासीनीकरण",
        ],
        "atom": ["atom", "atomic", "proton", "neutron", "electron", "परमाणु"],
    }

    def _hash_to_vector(self, text: str) -> list[float]:
        """Generate deterministic 384-dim unit vector from tokens and semantic domains."""
        vector = [0.0] * self.DIMENSION
        if not text:
            vector[0] = 1.0
            return vector

        lower = text.lower()

        # 1. Semantic domain boost in first 192 dimensions for dense concept alignment
        for d_idx, (_domain, kws) in enumerate(self._SEMANTIC_DOMAINS.items()):
            if any(kw in lower for kw in kws):
                for i in range(12):
                    vector[d_idx * 12 + i] += 12.0

        # 2. Token hash in remaining 192 dimensions
        tokens = lower.split()
        for token in tokens:
            h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
            idx = 192 + (h % (self.DIMENSION - 192))
            weight = 1.0 + (h % 5) * 0.2
            vector[idx] += weight

        # Normalize to unit length for valid cosine distance
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0.0:
            return [x / norm for x in vector]
        vector[0] = 1.0
        return vector

    async def get_embedding(self, text: str) -> list[float]:
        if self.should_fail:
            raise ConnectionError("Mock embedding service simulated failure")
        return self._hash_to_vector(text)

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        if self.should_fail:
            raise ConnectionError("Mock embedding service simulated failure")
        return [self._hash_to_vector(t) for t in texts]

    async def generate_chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 600,
    ) -> tuple[str, int, float]:
        _ = (temperature, max_tokens)
        if self.should_fail:
            raise TimeoutError("Mock LLM simulated timeout failure")

        user_content = ""
        context_content = ""
        for m in messages:
            if m.get("role") == "user":
                user_content += m.get("content", "")
            elif m.get("role") == "system":
                context_content += m.get("content", "")

        # Generate a helpful Socratic response based on input
        response_text = (
            "Let's break this down step-by-step. "
            "First, recall the key rule from your curriculum: "
            "when working with these operations, pay close attention to signs and place values. "
            "What do you get if you calculate the first step?"
        )
        tokens_used = len(user_content.split()) + len(response_text.split()) + 40
        cost_usd = (tokens_used / 1000.0) * 0.0003

        return response_text, tokens_used, cost_usd


class OpenAILLMProvider(LLMProvider):
    """Production provider connecting to OpenAI or compatible HTTP endpoint."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        chat_model: str = "gpt-4o-mini",
        embedding_model: str = "text-embedding-3-small",
        timeout_seconds: float = 5.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.chat_model = chat_model
        self.embedding_model = embedding_model
        self.timeout = timeout_seconds

    async def get_embedding(self, text: str) -> list[float]:
        results = await self.get_embeddings([text])
        if not results:
            raise ValueError("Empty embedding returned from OpenAI")
        return results[0]

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.embedding_model,
            "input": texts,
            "dimensions": 384,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI embedding error {resp.status_code}: {resp.text}")
            data: dict[str, Any] = resp.json()
            items = data.get("data", [])
            return [item["embedding"] for item in items]

    async def generate_chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 600,
    ) -> tuple[str, int, float]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.chat_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI completion error {resp.status_code}: {resp.text}")
            data: dict[str, Any] = resp.json()
            choice = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            total_tokens = int(usage.get("total_tokens", len(choice.split()) * 2))

            # gpt-4o-mini blended rate ~$0.0003 per 1k tokens
            cost_usd = (total_tokens / 1000.0) * 0.0003
            return str(choice), total_tokens, cost_usd


def get_llm_provider(settings: Settings) -> LLMProvider:
    """Factory selecting configured LLM provider."""
    provider_name = settings.tutor_llm_provider.lower().strip()
    if provider_name == "openai" and settings.openai_api_key:
        return OpenAILLMProvider(
            api_key=settings.openai_api_key,
            base_url=settings.openai_api_base,
            chat_model=settings.tutor_llm_model,
            embedding_model=settings.tutor_embedding_model,
            timeout_seconds=settings.tutor_timeout_seconds,
        )
    return MockLLMProvider()
