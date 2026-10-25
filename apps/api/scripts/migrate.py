"""Database migration execution script."""

import sys
from pathlib import Path

import structlog
from alembic.config import Config

from alembic import command

logger = structlog.get_logger(__name__)


def run_migrations() -> None:
    """Execute all pending Alembic migrations up to head."""
    root_dir = Path(__file__).resolve().parent.parent
    ini_path = root_dir / "alembic.ini"

    logger.info("Running database migrations", ini=str(ini_path))
    alembic_cfg = Config(str(ini_path))
    command.upgrade(alembic_cfg, "head")
    logger.info("Database migrations successfully applied")


if __name__ == "__main__":
    try:
        run_migrations()
    except Exception as exc:
        logger.error("Migration execution failed", error=str(exc))
        sys.exit(1)
