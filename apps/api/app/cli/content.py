"""BodhAI content pack management CLI commands."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from app.core.content_importer import (
    ContentImporter,
    ContentValidationError,
    GraphCycleError,
    OrphanReferenceError,
    load_pack_from_path,
    validate_content_pack,
)
from app.db.session import get_session_factory


async def _run_import(pack_path: str, dry_run: bool, verbose: bool) -> int:
    """Async handler for pack validation and database import."""
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    path = Path(pack_path)
    print(f"\n[INFO] Loading BodhAI content pack from: {path.resolve()}")

    try:
        pack_data = load_pack_from_path(path)
    except FileNotFoundError as err:
        print(f"[ERROR] {err}", file=sys.stderr)
        return 1
    except ContentValidationError as err:
        print(f"[ERROR] Validation error reading pack: {err}", file=sys.stderr)
        return 1

    print("[INFO] Validating JSON schema and DAG prerequisite graph invariants...")
    validation = validate_content_pack(pack_data)

    if not validation.is_valid:
        print(
            f"\n[ERROR] Validation FAILED with {len(validation.errors)} error(s):", file=sys.stderr
        )
        for idx, error_item in enumerate(validation.errors, 1):
            print(f"   {idx}. {error_item}", file=sys.stderr)
        return 1

    print("[OK] Content pack schema and DAG invariants validated successfully.")
    print(f"   - Curriculum: {validation.curriculum_code}")
    print(f"   - Topics: {validation.topics_count}")
    print(f"   - Skills: {validation.skills_count}")
    print(f"   - Prerequisite Edges: {validation.prerequisites_count}")
    print(f"   - Questions: {validation.questions_count}")
    print(f"   - Glossary Terms: {validation.glossary_count}")

    if dry_run:
        print("\n[DRY-RUN] Computing diff without committing to database...")
    else:
        print("\n[INFO] Executing idempotent database import...")

    session_factory = get_session_factory()
    async with session_factory() as session:
        importer = ContentImporter(session)
        try:
            diff = await importer.import_pack(pack_data, dry_run=dry_run)
        except (ContentValidationError, GraphCycleError, OrphanReferenceError) as err:
            print(f"[ERROR] Import aborted: {err}", file=sys.stderr)
            return 1
        except Exception as exc:
            print(f"[ERROR] Database error during import: {exc}", file=sys.stderr)
            return 1

    mode_label = " [DRY-RUN]" if dry_run else ""
    print(f"\nImport Diff Summary{mode_label}:")
    print(
        f"   + Curriculum:     +{diff.curriculum_created} created, "
        f"~{diff.curriculum_updated} updated"
    )
    print(f"   + Topics:         +{diff.topics_created} created, ~{diff.topics_updated} updated")
    print(f"   + Skills:         +{diff.skills_created} created, ~{diff.skills_updated} updated")
    print(
        f"   + Prerequisites:  +{diff.prerequisites_created} created, "
        f"~{diff.prerequisites_updated} updated"
    )
    print(
        f"   + Glossary Terms: +{diff.glossary_created} created, ~{diff.glossary_updated} updated"
    )
    print(
        f"   + Questions:      +{diff.questions_created} created, ~{diff.questions_updated} updated"
    )
    print("   ----------------------------------------")
    print(f"   Total Mutations:  {diff.total_mutations}")

    if verbose and diff.details:
        print("\nDetailed Mutations:")
        for detail in diff.details[:50]:
            print(f"   - {detail}")
        if len(diff.details) > 50:
            print(f"   ... and {len(diff.details) - 50} more mutations")

    if dry_run:
        print("\n[OK] Dry run complete. No database changes were made.")
    else:
        print("\n[OK] Content pack imported successfully.")

    return 0


def handle_content_import(args: argparse.Namespace) -> int:
    """Synchronous entrypoint for content import CLI command."""
    return asyncio.run(
        _run_import(
            pack_path=args.pack,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
    )
