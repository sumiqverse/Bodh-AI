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
    assert heads[0] == "0003_content_engine"

    # Verify script 0001 can be retrieved and has upgrade / downgrade functions
    rev1 = script_dir.get_revision("0001_initial_schema")
    assert rev1 is not None
    assert rev1.module is not None
    assert hasattr(rev1.module, "upgrade")
    assert hasattr(rev1.module, "downgrade")

    # Verify script 0002 can be retrieved and has upgrade / downgrade functions
    rev2 = script_dir.get_revision("0002_auth_classes_rls")
    assert rev2 is not None
    assert rev2.module is not None
    assert hasattr(rev2.module, "upgrade")
    assert hasattr(rev2.module, "downgrade")

    # Verify script 0003 can be retrieved and has upgrade / downgrade functions
    rev3 = script_dir.get_revision("0003_content_engine")
    assert rev3 is not None
    assert rev3.module is not None
    assert hasattr(rev3.module, "upgrade")
    assert hasattr(rev3.module, "downgrade")
