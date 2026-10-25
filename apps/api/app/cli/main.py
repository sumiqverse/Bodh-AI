"""BodhAI root CLI entrypoint."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence

from app.cli.content import handle_content_import


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

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
