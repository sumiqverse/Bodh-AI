# BodhAI Agent Engineering Rules & Guardrails

These non-negotiable rules govern all AI assistance, automated tasks, and developer contributions to the BodhAI codebase.

---

### 1. TypeScript Strictness & No `any`

- All TypeScript code must adhere to strict typing (`noImplicitAny`, `strictNullChecks`, etc.).
- Never use `any`. Use discriminated unions, generics, `unknown` with type narrowing, or specific interfaces.
- Avoid unchecked type assertions (`as unknown as Type`). If an assertion is strictly unavoidable, document why.

### 2. Fully Typed Python

- Python code (FastAPI, utilities, tests) must be 100% typed.
- Every function, method, argument, and return value must have explicit type annotations.
- `mypy` must pass with `strict = true` and zero errors or warnings.
- No `Any` in Python code where domain types or generics can be expressed.

### 3. Every Feature Has Tests

- No implementation code is complete without corresponding automated unit tests.
- JavaScript/TypeScript features require Vitest unit tests in `src/__tests__/`.
- Python features require pytest unit tests in `tests/test_*.py`.
- Tests must cover happy paths, boundary conditions, and failure/error states.

### 4. No Hard-Coded UI Strings (i18n Only)

- Never hard-code user-facing strings, buttons, titles, errors, or labels directly in JSX/TSX.
- All copy must reside in the typed internationalization dictionary (`apps/web/src/lib/i18n.ts`).
- Support multiple locales (English, Hindi) cleanly through dictionary keys.

### 5. No Secrets in Code

- Never place API keys, private keys, database credentials, or tokens in source code or repositories.
- Use `.env.example` templates with explicit placeholders (e.g. `example-secret-key-change-in-production`).
- Validate compliance against `.gitleaks.toml`.

### 6. Accessibility (WCAG 2.2 AA)

- Web UI components and pages must comply with WCAG 2.2 Level AA accessibility standards.
- Use semantic HTML tags (`<header>`, `<main>`, `<nav>`, `<section>`, `<button>`).
- Ensure adequate color contrast, explicit keyboard focus rings (`focus-visible:ring-2`), and appropriate ARIA attributes (`aria-label`, `aria-pressed`, `aria-hidden`).

### 7. Small, Atomic Commits

- Make atomic, cohesive commits adhering to Conventional Commits standard (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Keep pull requests small and focused on a single architectural or feature goal.

### 8. Update Documentation When Behavior Changes

- When adding, modifying, or deprecating features, routes, components, or configurations, update the corresponding documentation (`docs/`, `README.md`, `ARCHITECTURE.md`).
- Architectural decisions must be documented via Architecture Decision Records (ADRs) in `docs/ADR/`.

### 9. Never Invent Product Facts or Statistics

- Never extrapolate, hallucinate, or invent product metrics, test scores, pedagogical claims, board syllabi, or statistics.
- If curriculum or empirical data is needed, cite official NCERT/State Board frameworks or reference verified items in `content/`.

### 10. Ask Before Destructive Commands

- Always confirm with the user before executing destructive filesystem or git commands (e.g., `git reset --hard`, `git clean -fd`, deleting directories or databases).

---

## Definition of Done (DoD)

A task, feature, or PR is considered DONE only when:

1. `pnpm verify` is completely green (zero lint warnings, strict typechecks pass, all tests pass, build succeeds).
2. Automated unit/integration tests are written and passing.
3. Relevant documentation and ADRs are created or updated.
