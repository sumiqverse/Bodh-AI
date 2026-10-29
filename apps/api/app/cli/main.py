"""BodhAI root CLI entrypoint."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence

from app.cli.content import handle_content_import
from app.cli.retention import handle_retention_purge


def build_parser() -> argparse.ArgumentParser:
    """Build parser for BodhAI CLI commands."""
    parser = argparse.ArgumentParser(
        prog="bodhai",
        description="BodhAI CLI: Curriculum, Content, and Platform Management",
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # bodhai content ...
    content_parser = subparsers.add_parser("content", help="Content pack commands")
    content_subparsers = content_parser.add_subparsers(
        dest="content_command", help="Content operations"
    )

    # bodhai content import <pack>
    import_parser = content_subparsers.add_parser(
        "import",
        help="Import and validate a curriculum content pack into the database",
    )
    import_parser.add_argument(
        "pack",
        type=str,
        help="Path to content pack file (.json, .yaml) or directory",
    )
    import_parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Validate and calculate diff without persisting changes",
    )
    import_parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        default=False,
        help="Print detailed mutation items",
    )

    # bodhai retention ...
    retention_parser = subparsers.add_parser("retention", help="DPDP Act retention & erasure jobs")
    retention_subparsers = retention_parser.add_subparsers(
        dest="retention_command", help="Retention operations"
    )

    # bodhai retention purge
    purge_parser = retention_subparsers.add_parser(
        "purge",
        help="Purge expired sessions, soft-deleted users, stale tutor logs, and sync events",
    )
    purge_parser.add_argument(
        "--grace-days",
        type=int,
        default=30,
        help="Grace period days for soft-deleted user retention (default: 30)",
    )
    purge_parser.add_argument(
        "--tutor-days",
        type=int,
        default=90,
        help="Retention threshold days for AI tutor logs (default: 90)",
    )
    purge_parser.add_argument(
        "--sync-days",
        type=int,
        default=30,
        help="Retention threshold days for processed sync queue items (default: 30)",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Main CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv if argv is not None else sys.argv[1:])

    if args.subcommand == "content":
        if args.content_command == "import":
            return handle_content_import(args)
        parser.print_help()
        return 1

    if args.subcommand == "retention":
        if args.retention_command == "purge":
            return handle_retention_purge(args)
        parser.print_help()
        return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
