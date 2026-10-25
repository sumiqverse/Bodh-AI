"""Export OpenAPI JSON schema from the FastAPI application."""

import json
import sys
from pathlib import Path

# Ensure apps/api root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import structlog

from app.main import app

logger = structlog.get_logger(__name__)


def export_openapi() -> None:
    """Generate and write the OpenAPI schema JSON to packages/api-client and docs."""
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    target_path = root_dir / "packages" / "api-client" / "openapi.json"

    logger.info("Exporting OpenAPI schema", target=str(target_path))
    schema = app.openapi()

    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)

    logger.info("OpenAPI schema exported successfully", routes_count=len(app.routes))


if __name__ == "__main__":
    try:
        export_openapi()
    except Exception as exc:
        logger.error("OpenAPI export failed", error=str(exc))
        sys.exit(1)
