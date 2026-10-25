"""Database reset script executing downgrade and clean upgrade."""

import sys
from pathlib import Path

import structlog
from alembic.config import Config

from alembic import command

logger = structlog.get_logger(__name__)


def reset_database() -> None:
    """Reset the database by dropping to base revision and reapplying migrations."""
    root_dir = Path(__file__).resolve().parent.parent
    ini_path = root_dir / "alembic.ini"

    logger.warning("Resetting database schema to base and re-migrating", ini=str(ini_path))
    alembic_cfg = Config(str(ini_path))
    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")
    logger.info("Database schema reset completed successfully")


if __name__ == "__main__":
    try:
        reset_database()
    except Exception as exc:
        logger.error("Database reset failed", error=str(exc))
        sys.exit(1)
