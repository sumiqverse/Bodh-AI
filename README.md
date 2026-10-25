# BodhAI (बोधAI)

> Adaptive learning platform for Classes 6–10 in India (web first).

BodhAI provides personalized diagnostic assessments, mastery learning pathways, and competency-aligned practice for middle and high school students across India.

---

## Architecture at a Glance

This repository is structured as a **pnpm + Turborepo** monorepo:

| Path                                         | Description                                                 | Tech Stack                                               |
| :------------------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------- |
| [`apps/web`](apps/web)                       | Student web application (hello page, diagnostics, practice) | Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui |
| [`apps/api`](apps/api)                       | High-performance backend API service                        | FastAPI, Python 3.12, `uv`                               |
| [`packages/ui`](packages/ui)                 | Shared accessible design system & components                | React 19, Tailwind CSS, WCAG 2.2 AA compliant            |
| [`packages/engine-ts`](packages/engine-ts)   | Adaptive learning algorithms & mastery estimation           | TypeScript strict, pure algorithms                       |
| [`packages/api-client`](packages/api-client) | End-to-end typed client library for the API                 | TypeScript strict, fetch API                             |
| [`packages/config`](packages/config)         | Shared compiler configurations                              | Base, Next.js, React, and Node `tsconfig` files          |
| [`content/`](content/)                       | Curriculum standards & item banks for Classes 6–10          | JSON / YAML schema specifications                        |
| [`infra/`](infra/)                           | Docker containers & local orchestration                     | Docker, Docker Compose, PostgreSQL                       |
| [`docs/`](docs/)                             | Architecture, system design, and ADR records                | Markdown                                                 |

---

## Prerequisites

- **Node.js**: `v24.x` (managed via `.nvmrc`)
- **pnpm**: `v10.x` or `v11.x`
- **Python**: `3.12.x`
- **uv**: Python package and project manager (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `pip install uv`)
- **Git**: `2.30+`

---

## Getting Started

### 1. Clone & Install Dependencies

```powershell
# Install Node workspaces dependencies and initialize Husky hooks
pnpm install

# Initialize Python virtual environment and dependencies for apps/api
cd apps/api
uv sync
cd ../..
```

### 2. Environment Setup

```powershell
# Copy environment template
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

### 3. Verify the Codebase

Run the comprehensive verification gate (lint, typecheck, unit tests, and build):

```powershell
pnpm verify
```

_This must pass with 0 errors and 0 warnings._

---

## Development

Run both the web frontend and API backend in parallel:

```powershell
# Run dev servers across all workspaces
pnpm dev
```

Or run individual services:

```powershell
# Frontend on http://localhost:3000
pnpm --filter @bodhai/web dev

# Backend on http://localhost:8000 (Interactive Docs: http://localhost:8000/docs)
pnpm --filter @bodhai/api dev
```

### Verification Endpoints

- **Web**: Open [http://localhost:3000](http://localhost:3000) to see the BodhAI home page.
- **API Health Check**: GET [http://localhost:8000/health](http://localhost:8000/health) returns `{"status":"ok"}`.

---

## Monorepo Scripts

| Command          | Action                                                                             |
| :--------------- | :--------------------------------------------------------------------------------- |
| `pnpm verify`    | **Primary gate**: runs lint, typecheck, unit tests, and build. Fails on any issue. |
| `pnpm lint`      | Runs JS/TS ESLint (`--max-warnings=0`), Python Ruff, and Prettier check.           |
| `pnpm format`    | Formats all code with Prettier.                                                    |
| `pnpm typecheck` | Runs TypeScript `tsc --noEmit` on all packages and `mypy --strict` on API.         |
| `pnpm test`      | Runs all unit tests (Vitest for TS packages and pytest for Python API).            |
| `pnpm build`     | Compiles and builds all packages and apps via Turborepo.                           |

---

## Documentation & Guidelines

- **Architecture Details**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Monorepo Decision (ADR)**: [docs/ADR/0001-monorepo.md](docs/ADR/0001-monorepo.md)
- **Agent Rules & DoD**: [.agent/rules/bodhai.md](.agent/rules/bodhai.md)
- **Contribution Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
