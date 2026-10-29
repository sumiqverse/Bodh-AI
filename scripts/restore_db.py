#!/usr/bin/env python3
"""Database restore script with SHA-256 integrity verification and safety checks."""

import argparse
import gzip
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path


def calculate_sha256(filepath: Path) -> str:
    """Compute the SHA-256 hex digest of a file."""
    hasher = hashlib.sha256()
    with filepath.open("rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def restore_database(
    backup_file: Path,
    target_db_url: str,
    skip_verify: bool = False,
) -> bool:
    """Verify checksum and restore database from compressed backup.

    Returns:
        bool: True if restore succeeded, raises exception on integrity failure.
    """
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    # Step 1: Verify checksum
    if not skip_verify:
        checksum_file = Path(str(backup_file) + ".sha256")
        if not checksum_file.exists():
            raise FileNotFoundError(f"Missing checksum file: {checksum_file}")

        expected_checksum = checksum_file.read_text(encoding="utf-8").strip().split()[0]
        actual_checksum = calculate_sha256(backup_file)

        if expected_checksum != actual_checksum:
            raise ValueError(
                f"INTEGRITY ERROR: Checksum mismatch! Expected {expected_checksum}, got {actual_checksum}"
            )
        print(f"VERIFIED: Checksum match ({actual_checksum})")

    # Step 2: Restore database
    if "sqlite" in target_db_url.lower():
        raw_db_path = target_db_url.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
        dest_path = Path(raw_db_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        with gzip.open(backup_file, "rb") as f_in, dest_path.open("wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        print(f"SUCCESS: Restored SQLite database to {dest_path}")
    else:
        clean_url = target_db_url.replace("postgresql+asyncpg://", "postgresql://")
        with gzip.open(backup_file, "rb") as f_in:
            proc = subprocess.Popen(
                ["psql", clean_url],
                stdin=f_in,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"psql restore failed: {stderr.decode()}")
        print(f"SUCCESS: Restored PostgreSQL database to {clean_url}")

    return True


def main() -> int:
    """CLI entrypoint for database restore."""
    parser = argparse.ArgumentParser(description="BodhAI Database Restore Utility")
    parser.add_argument(
        "--backup-file",
        type=Path,
        required=True,
        help="Path to .gz database backup file",
    )
    parser.add_argument(
        "--target-db-url",
        default=os.getenv("DATABASE_URL", "sqlite:///./restored_bodhai.db"),
        help="Target database URI to restore into",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Bypass SHA-256 verification (NOT recommended)",
    )

    args = parser.parse_args()
    try:
        restore_database(args.backup_file, args.target_db_url, args.skip_verify)
        return 0
    except Exception as exc:
        print(f"ERROR: Restore failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
