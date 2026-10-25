# Workflow: Implement New Feature

Follow this rigorous, test-driven engineering workflow when implementing any feature in BodhAI.

---

## 1. Plan

- **Analyze Requirements**: Understand the feature goal for Classes 6–10 adaptive learning.
- **Identify Affected Packages**: Determine if the change touches `apps/web`, `apps/api`, `packages/engine-ts`, `packages/api-client`, or `packages/ui`.
- **Review Guardrails**: Confirm compliance with `.agent/rules/bodhai.md` (no `any`, fully typed Python, i18n copy, WCAG 2.2 AA).
- **Define Interface Contracts**: Draft typed signatures, schemas (Pydantic / TypeScript types), and endpoints before writing code.

---

## 2. Tests First (TDD)

- **Unit Test Scaffolding**: Write failing tests before writing the implementation:
  - TypeScript: In `src/__tests__/*.test.ts` or `src/__tests__/*.test.tsx`.
  - Python: In `tests/test_*.py`.
- **Cover Key Scenarios**:
  - Happy path / standard valid input.
  - Edge cases (null/undefined values, boundary conditions, empty states).
  - Error responses (4xx/5xx status codes, thrown errors, invalid inputs).
- **Verify Test Failure**: Confirm that tests fail for the expected reason prior to implementation.

---

## 3. Implement

- **Minimal Clean Implementation**: Write the cleanest code that satisfies the tests.
- **Strict Typing**:
  - TS: Zero `any`, complete return types, proper interfaces.
  - Python: Explicit type annotations throughout, adhering to `mypy --strict`.
- **UI & i18n**:
  - If adding user-facing UI, add translation keys to `apps/web/src/lib/i18n.ts`. Never hard-code UI strings.
  - Use accessible semantic HTML, keyboard navigation, and focus rings.

---

## 4. Verify & Document

- **Run Verification**:
  ```powershell
  pnpm verify
  ```
- **Address Failures**: Fix any lint, formatting, typing, testing, or build issues immediately until `pnpm verify` is 100% green.
- **Update Documentation**:
  - Update `docs/ARCHITECTURE.md` or relevant READMEs if architecture or behaviors changed.
  - Add an Architecture Decision Record in `docs/ADR/` for major architectural decisions.
- **Commit**: Create conventional commit(s) (e.g. `feat(engine): add Bayesian knowledge tracing update`).
