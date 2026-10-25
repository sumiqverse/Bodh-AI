"""Tests for Alembic migrations structure and configuration."""

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_config_and_revisions() -> None:
    """Ensure alembic config exists and revision 0001 is present as current head."""
    root_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = root_dir / "alembic.ini"
    assert alembic_ini_path.exists(), "alembic.ini must exist in apps/api"

    config = Config(str(alembic_ini_path))
    script_dir = ScriptDirectory.from_config(config)

    # Verify head revision
    heads = script_dir.get_heads()
    assert len(heads) == 1
    assert heads[0] == "0001_initial_schema"

    # Verify script can be retrieved and has upgrade / downgrade functions
    rev = script_dir.get_revision("0001_initial_schema")
    assert rev is not None
    assert rev.module is not None
    assert hasattr(rev.module, "upgrade")
    assert hasattr(rev.module, "downgrade")
