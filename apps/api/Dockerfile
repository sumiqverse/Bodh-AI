# Multi-stage production Dockerfile for BodhAI API (FastAPI, Python 3.12)
# 1. Builder stage
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=0 \
    UV_COMPILE_BYTECODE=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5.26 /uv /uvx /bin/

# Create isolated virtual environment
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY apps/api/pyproject.toml apps/api/README.md ./apps/api/
WORKDIR /app/apps/api
RUN uv pip install --no-cache -r pyproject.toml

# 2. Minimal runtime runner stage
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user and group
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh -m appuser

# Copy virtualenv and application from builder
COPY --from=builder --chown=appuser:appgroup /opt/venv /opt/venv
COPY --chown=appuser:appgroup apps/api/app /app/app
COPY --chown=appuser:appgroup apps/api/alembic /app/alembic
COPY --chown=appuser:appgroup apps/api/alembic.ini /app/alembic.ini
COPY --chown=appuser:appgroup content /app/content

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
