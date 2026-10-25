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
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated allow-list of origin URLs for CORS",
    )

    # Database & Cache
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/bodhai_dev",
        description="Async SQLAlchemy database connection string",
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

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
