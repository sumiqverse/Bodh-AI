"""Automatic database migration runner on application startup."""

import asyncio
from pathlib import Path

import structlog
from alembic.config import Config

from alembic import command
from app.core.config import get_settings

logger = structlog.get_logger(__name__)


def run_migrations() -> None:
    """Execute Alembic upgrade head to ensure database schema is up-to-date."""
    settings = get_settings()
    if settings.app_env == "test" or settings.database_url.startswith("sqlite"):
        logger.info("Skipping database migrations in test/sqlite environment")
        return

    api_dir = Path(__file__).resolve().parent.parent.parent
    ini_path = api_dir / "alembic.ini"
    if not ini_path.exists():
        ini_path = Path("alembic.ini")

    if not ini_path.exists():
        logger.warning("alembic.ini not found, skipping startup migrations", path=str(ini_path))
        return

    logger.info(
        "Checking and applying pending database migrations to head",
        alembic_ini=str(ini_path),
    )
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(api_dir / "alembic"))
    command.upgrade(alembic_cfg, "head")
    logger.info("Database schema is up-to-date with Alembic head")


async def run_startup_migrations() -> None:
    """Run database migrations in a worker thread to avoid blocking the event loop."""
    try:
        await asyncio.to_thread(run_migrations)
    except Exception as exc:
        logger.exception("Failed to run database migrations on startup", error=str(exc))
