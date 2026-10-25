# Workflow: Verify Codebase Health

This workflow executes full monorepo verification and produces an actionable diagnostic summary of any failures.

---

## Steps

### 1. Run Monorepo Verification

Execute the root verification script:

```powershell
pnpm verify
```

### 2. Failure Diagnosis Breakdown

If `pnpm verify` exits with a non-zero code, identify which gate failed:

1. **Lint Failure (`pnpm run lint`)**:
   - JS/TS ESLint: Run `pnpm run lint:js` to see exact files and rules violated. (Remember: zero warnings allowed).
   - Python Ruff: Run `pnpm --filter @bodhai/api lint` to inspect PEP8 / Ruff violations.
   - Prettier formatting: Run `pnpm run lint:format`. Use `pnpm run format` to auto-format.

2. **Typecheck Failure (`pnpm run typecheck`)**:
   - TypeScript: Run `turbo run typecheck` to view compiler diagnostic messages. Ensure no implicit `any` or strict violations.
   - Python Mypy: Run `pnpm --filter @bodhai/api typecheck` to view mypy strict violations.

3. **Test Failure (`pnpm run test:unit`)**:
   - Vitest: Run `vitest run` to identify failing TS assertions or broken mocks.
   - Pytest: Run `pnpm --filter @bodhai/api test` to see Python tracebacks.

4. **Build Failure (`pnpm run build`)**:
   - Next.js or package builds: Run `turbo run build` to inspect Next.js compilation or bundle errors.

### 3. Reporting Summary

Provide a structured diagnostic report:

- **Gate**: Which step failed (Lint / Typecheck / Test / Build).
- **Package**: Which package or app produced the failure.
- **Root Cause**: The error message and line number.
- **Remediation**: The minimal, safe code fix needed.
