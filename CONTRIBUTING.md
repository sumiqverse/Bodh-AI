# Contributing to BodhAI

Thank you for contributing to BodhAI! We are building an adaptive learning platform for Classes 6–10 in India.

Please read our engineering rules in [.agent/rules/bodhai.md](.agent/rules/bodhai.md) before submitting code.

---

## 1. Prerequisites

Ensure you have the following installed locally:

- **Node.js**: v24.x (see `.nvmrc`)
- **pnpm**: v10.x / v11.x
- **Python**: 3.12.x
- **uv**: Python package installer and resolver (`uv --version`)
- **Git**: 2.30+

---

## 2. Quick Setup

```powershell
# 1. Install Node workspace dependencies and initialize git hooks
pnpm install

# 2. Sync Python environment and dependencies
cd apps/api
uv sync
cd ../..

# 3. Create your local environment file
cp .env.example .env
```

---

## 3. Engineering Standards

- **TypeScript**: Strict mode enabled. The `any` type is strictly forbidden. Use proper type definitions, unions, and generics.
- **Python**: 100% typed. All function signatures and module variables must pass `mypy --strict`.
- **UI Copy**: Never hard-code user-facing strings. Add all strings to the typed dictionary in `apps/web/src/lib/i18n.ts`.
- **Accessibility**: UI elements must satisfy WCAG 2.2 AA standards (adequate contrast, keyboard focus, semantic HTML, ARIA tags).
- **Tests First**: Every new feature or bug fix must include automated tests (Vitest for TS, pytest for Python).

---

## 4. Verification Workflow

Before pushing code or opening a PR, always run:

```powershell
pnpm verify
```

This runs:

1. Lint: ESLint (0 warnings allowed) + Python Ruff check + Prettier formatting.
2. Typecheck: `tsc --noEmit` across all workspaces + `mypy --strict` on Python.
3. Unit tests: Vitest (TS suite) + pytest (Python suite).
4. Build: Next.js build + package builds.

If any check fails, `pnpm verify` exits with a non-zero code.

---

## 5. Commit Guidelines

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification via commitlint and Husky:

Format: `<type>(<scope>): <short description>`

Examples:

- `feat(engine): calculate bounded mastery update`
- `fix(web): correct focus visible ring on class selector buttons`
- `test(api): add health route status check`
- `docs(adr): document monorepo decision record`

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
