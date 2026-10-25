# @bodhai/api

FastAPI backend service for BodhAI, built on Python 3.12 and managed with `uv`.

## Architecture & Layout

```
apps/api/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── health.py    # Health check endpoint
│   ├── config.py            # Strongly typed pydantic settings
│   └── main.py              # Application lifecycle and router mounting
├── tests/
│   ├── conftest.py          # Pytest fixtures and TestClient setup
│   └── test_health.py       # Health endpoint test
├── pyproject.toml           # Project dependencies, Ruff, mypy, pytest configs
└── package.json             # Turborepo task hooks
```

## Running Locally

```bash
# Sync virtualenv and dependencies
uv sync

# Run development server with reload
uv run uvicorn app.main:app --reload --port 8000

# Run checks
uv run ruff check .
uv run mypy app tests
uv run pytest
```
