# ADR 0001: Adoption of pnpm + Turborepo Monorepo for BodhAI

- **Status**: Accepted
- **Date**: 2026-10-25
- **Deciders**: Senior Staff Engineering Team

---

## Context

BodhAI is an adaptive learning platform targeting students in Classes 6–10 in India (web first).
The platform requires:

1. A modern, accessible web client (`apps/web` with Next.js App Router).
2. A high-performance Python API (`apps/api` with FastAPI and Python 3.12).
3. Shared adaptive learning logic (`packages/engine-ts`), reusable UI design primitives (`packages/ui`), a typed API client (`packages/api-client`), and base configurations (`packages/config`).
4. Curriculum trees and diagnostic question items (`content/`).
5. Infrastructure and container blueprints (`infra/`).

Maintaining multiple separate repositories would introduce dependency synchronization overhead, version skew between API models and client contracts, duplicate configurations, and fragmented CI pipelines.

---

## Decision

We adopt a unified **pnpm + Turborepo monorepo**:

1. **Workspace Management**: `pnpm` workspaces for fast, disk-efficient dependency resolution and strict isolation.
2. **Task Orchestration**: `Turborepo` (`turbo`) for pipeline execution, topological dependency resolution, and caching of build, lint, typecheck, and test tasks.
3. **Python Tooling**: `uv` for Python 3.12 dependency management and virtual environment management in `apps/api`.
4. **Unified Verification Gate**: A root command `pnpm verify` that gates all linting, type checking, unit testing, and building across both TypeScript and Python workspaces.

---

## Consequences

### Positive

- **Single Source of Truth**: UI components, adaptive engine algorithms, and API client definitions reside in the same repository as the web application.
- **Zero Drift**: Type contracts and shared logic can be updated in atomic pull requests.
- **High-Performance Caching**: Turborepo caches successful compilation and test outputs locally and in CI.
- **Deterministic CI**: Single PR verification script (`pnpm verify`) with GitHub Actions caching for both Node and uv/Python.

### Negative / Trade-offs

- Monorepos require unified developer tooling and disciplined commit practices (enforced by Husky, lint-staged, and commitlint).
- Developers must have Node.js (v24), pnpm, and Python 3.12 (`uv`) available locally.
