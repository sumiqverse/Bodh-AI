# BodhAI Infrastructure Foundation

Containerization, deployment manifests, and local orchestration for BodhAI.

## Services

- `web`: Next.js web application container.
- `api`: FastAPI application container with Python 3.12 and uv.
- `db`: PostgreSQL database for local development.

## Local Docker Setup

```bash
docker compose -f infra/docker-compose.yml up --build
```
