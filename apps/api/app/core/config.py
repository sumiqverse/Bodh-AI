"""Application configuration using Pydantic Settings (Pydantic v2)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with strict type annotations and fail-fast validation."""

    app_name: str = Field(default="BodhAI API", description="Public name of the application")
    app_env: Literal["local", "development", "staging", "production"] = Field(
        default="local",
        description="Operating environment name",
    )
    debug: bool = Field(default=False, description="Enable debug mode")
    port: int = Field(default=8000, description="Port the FastAPI server binds to")
    host: str = Field(default="0.0.0.0", description="Host address to bind")

    # Security & CORS
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-1234567890",
        description="Cryptographic secret key for signing sessions and tokens",
    )
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://testserver",
        description="Comma-separated allow-list of origin URLs for CORS",
    )
    current_consent_version: str = Field(
        default="2026.1",
        description="Active DPDP policy consent version required for student learning access",
    )
    jwt_algorithm: str = Field(default="HS256", description="Algorithm for signing JWTs")
    access_token_expire_minutes: int = Field(
        default=15,
        description="Access token lifespan in minutes",
    )
    refresh_token_expire_days: int = Field(
        default=7,
        description="Refresh token lifespan in days",
    )
    supabase_jwt_secret: str = Field(
        default="",
        description="Supabase JWT secret for validating external OAuth tokens",
    )
    neon_auth_base_url: str = Field(
        default="",
        description="Neon Auth Base URL for authentication service",
    )
    neon_auth_jwks_url: str = Field(
        default="",
        description="Neon Auth JWKS URL for JSON Web Key Set validation",
    )

    # Database & Cache
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/bodhai_dev",
        description="Async SQLAlchemy database connection string",
    )
    database_url_unpooled: str = Field(
        default="",
        description="Direct unpooled database connection string for migrations",
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for caching and rate limiting",
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=60,
        description="Maximum requests permitted per client per minute",
    )

    # AI Tutor Service Settings
    tutor_llm_provider: str = Field(
        default="mock",
        description="LLM provider: mock, openai",
    )
    openai_api_key: str = Field(
        default="",
        description="Optional API key for external LLM provider",
    )
    openai_api_base: str = Field(
        default="https://api.openai.com/v1",
        description="Base URL for OpenAI-compatible API",
    )
    tutor_llm_model: str = Field(
        default="gpt-4o-mini",
        description="Model identifier for tutor chat completion",
    )
    tutor_embedding_model: str = Field(
        default="text-embedding-3-small",
        description="Model identifier for semantic embeddings",
    )
    tutor_similarity_threshold: float = Field(
        default=0.70,
        description="Minimum cosine similarity threshold for grounding",
    )
    tutor_top_k: int = Field(
        default=5,
        description="Top-k context chunks to retrieve",
    )
    tutor_monthly_budget_usd: float = Field(
        default=50.0,
        description="Monthly cost budget limit in USD",
    )
    tutor_per_user_rate_limit: int = Field(
        default=20,
        description="Max tutor requests per student per minute",
    )
    tutor_global_rate_limit: int = Field(
        default=500,
        description="Max global tutor requests per minute",
    )
    tutor_circuit_breaker_threshold: int = Field(
        default=3,
        description="Consecutive failure threshold before opening circuit",
    )
    tutor_circuit_breaker_recovery_sec: int = Field(
        default=30,
        description="Seconds to wait before half-open circuit test",
    )
    tutor_timeout_seconds: float = Field(
        default=5.0,
        description="Timeout in seconds for external LLM calls",
    )
    tutor_log_retention_days: int = Field(
        default=90,
        description="Days to retain privacy interaction logs before pruning",
    )

    # Observability & Monitoring
    sentry_dsn: str = Field(
        default="",
        description="Sentry DSN for error and performance monitoring",
    )
    sentry_traces_sample_rate: float = Field(
        default=0.1,
        description="Sentry trace sampling rate between 0.0 and 1.0",
    )
    otel_exporter_otlp_endpoint: str = Field(
        default="",
        description="OpenTelemetry collector OTLP exporter endpoint",
    )

    # Feature Flags & Maintenance
    feature_flags: str = Field(
        default="aiTutor,offlineMode,detailedDiagnostics,feedbackForm",
        description="Comma-separated list of enabled feature flags",
    )
    maintenance_mode: bool = Field(
        default=False,
        description="Whether the service is under scheduled maintenance",
    )

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env", "../../.env.local", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("database_url", "database_url_unpooled", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Ensure connection string uses asyncpg driver and clean SSL options."""
        if isinstance(v, str) and v:
            if v.startswith("postgres://"):
                v = "postgresql+asyncpg://" + v[len("postgres://") :]
            elif v.startswith("postgresql://"):
                v = "postgresql+asyncpg://" + v[len("postgresql://") :]
            # asyncpg prefers ssl=require or sslmode=require without channel_binding
            v = (
                v.replace("channel_binding=require&", "")
                .replace("&channel_binding=require", "")
                .replace("channel_binding=require", "")
            )
            if "sslmode=require" in v and "ssl=require" not in v:
                v = v.replace("sslmode=require", "ssl=require")
        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str, info: object) -> str:
        """Fail fast in production if the default development secret is still configured."""
        # Retrieve raw environment dictionary safely
        if isinstance(info, object) and hasattr(info, "data"):
            env = getattr(info, "data", {}).get("app_env", "local")
            if env in ("staging", "production") and "dev-insecure" in v:
                raise ValueError(
                    "CRITICAL: Insecure default secret_key cannot be used in production/staging!"
                )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a typed list of strings."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton provider for application settings."""
    return Settings()


settings = get_settings()
