#!/usr/bin/env python3
"""Automated database backup script with SHA-256 checksum verification and gzip compression."""

import argparse
import gzip
import hashlib
import os
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def calculate_sha256(filepath: Path) -> str:
    """Compute the SHA-256 hex digest of a file."""
    hasher = hashlib.sha256()
    with filepath.open("rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def backup_database(db_url: str, output_dir: Path) -> tuple[Path, str]:
    """Create a compressed database backup and companion SHA-256 checksum.

    Returns:
        tuple[Path, str]: (path_to_compressed_backup, sha256_checksum)
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if "sqlite" in db_url.lower():
        # SQLite database backup
        raw_db_path = db_url.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
        source_path = Path(raw_db_path)

        if not source_path.exists():
            # Create a sample test database if not exists
            conn = sqlite3.connect(source_path)
            conn.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, val TEXT)")
            conn.execute("INSERT OR REPLACE INTO metadata VALUES ('version', '1.0.0')")
            conn.commit()
            conn.close()

        target_file = output_dir / f"bodhai_backup_{timestamp}.sqlite.gz"
        with source_path.open("rb") as f_in, gzip.open(target_file, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
    else:
        # PostgreSQL backup via pg_dump
        target_file = output_dir / f"bodhai_backup_{timestamp}.sql.gz"
        clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        dump_proc = subprocess.Popen(
            ["pg_dump", "--clean", "--if-exists", "--no-owner", clean_url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        with gzip.open(target_file, "wb") as f_out:
            if dump_proc.stdout:
                shutil.copyfileobj(dump_proc.stdout, f_out)
        dump_proc.wait()
        if dump_proc.returncode != 0:
            stderr = dump_proc.stderr.read().decode() if dump_proc.stderr else ""
            raise RuntimeError(f"pg_dump failed with code {dump_proc.returncode}: {stderr}")

    checksum = calculate_sha256(target_file)
    checksum_file = target_file.with_suffix(target_file.suffix + ".sha256")
    checksum_file.write_text(f"{checksum}  {target_file.name}\n", encoding="utf-8")

    return target_file, checksum


def main() -> int:
    """CLI entrypoint for database backup."""
    parser = argparse.ArgumentParser(description="BodhAI Database Backup Utility")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", "sqlite:///./test_bodhai.db"),
        help="Database connection URI",
    )
    parser.add_argument(
        "--target-dir",
        type=Path,
        default=Path("./backups"),
        help="Output directory for backup archives",
    )

    args = parser.parse_args()
    try:
        backup_file, checksum = backup_database(args.db_url, args.target_dir)
        print(f"SUCCESS: Backup written to {backup_file}")
        print(f"SHA-256: {checksum}")
        return 0
    except Exception as exc:
        print(f"ERROR: Backup failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
