.PHONY: migrate seed reset openapi test lint typecheck

migrate:
	uv run python scripts/migrate.py

seed:
	uv run python scripts/seed.py

reset:
	uv run python scripts/reset.py

openapi:
	uv run python scripts/export_openapi.py

test:
	uv run pytest

lint:
	uv run ruff check .
	uv run ruff format --check .

typecheck:
	uv run mypy app tests
