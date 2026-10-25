"""Unit and integration tests for bodhai CLI content commands."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from app.cli.main import build_parser, main


def test_build_parser_structure() -> None:
    """CLI parser builds correctly with content import arguments."""
    parser = build_parser()
    args = parser.parse_args(["content", "import", "content/class8-maths", "--dry-run", "-v"])
    assert args.subcommand == "content"
    assert args.content_command == "import"
    assert args.pack == "content/class8-maths"
    assert args.dry_run is True
    assert args.verbose is True


def test_main_without_args_returns_1(capsys: pytest.CaptureFixture[str]) -> None:
    """Executing main without arguments prints usage and returns 1."""
    code = main([])
    assert code == 1
    captured = capsys.readouterr()
    assert "usage:" in captured.out or "usage:" in captured.err


def test_main_content_no_subcommand() -> None:
    """Executing 'bodhai content' without subcommands returns 1."""
    code = main(["content"])
    assert code == 1


def test_cli_import_non_existent_path(capsys: pytest.CaptureFixture[str]) -> None:
    """Importing a non-existent path returns exit code 1."""
    code = main(["content", "import", "non_existent_directory_or_pack_path", "--dry-run"])
    assert code == 1
    captured = capsys.readouterr()
    assert "[ERROR]" in captured.err or "[ERROR]" in captured.out


def test_cli_import_dry_run_class8_maths(
    monkeypatch: pytest.MonkeyPatch,
    test_engine: Any,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """Running dry-run CLI import on seeded class8-maths pack validates successfully."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    mock_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr("app.cli.content.get_session_factory", lambda: mock_factory)

    root = Path(__file__).resolve().parents[3]
    pack_dir = root / "content" / "class8-maths"
    if not pack_dir.exists():
        pytest.skip("class8-maths not found")

    code = main(["content", "import", str(pack_dir), "--dry-run", "-v"])
    assert code == 0
    captured = capsys.readouterr()
    assert "[INFO] Validating JSON schema and DAG prerequisite graph invariants..." in captured.out
    assert "[OK] Content pack schema and DAG invariants validated successfully." in captured.out
    assert "Import Diff Summary [DRY-RUN]:" in captured.out
    assert "Curriculum:" in captured.out
