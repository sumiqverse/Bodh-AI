# BodhAI Remediation Plan

> Source audit: [`AUDIT.md`](AUDIT.md)  
> Started: 3 November 2026  
> Rule: one workstream at a time. Every fix needs a regression test or an explicit verification step. Do not mix unrelated refactors into a security fix.

## Workstreams

| ID      | Workstream                                    | Issues covered                                                                                                                                                | Status      | Exit gate                                                                                                                                    |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **WS1** | Authentication bypass and default credentials | `mock_token_` backdoor, demo-token minting, hardcoded `Password@123`, known seed PINs                                                                         | **Done**    | Backdoor removed; demo UI no longer mints tokens; seed scripts require secrets; regression test passes                                       |
| **WS2** | Session lifecycle and auth hardening          | 24-hour access tokens, no revocation, localStorage tokens, refresh reuse, CSRF dead code, student-join lockout bypass                                         | **Done**    | 15-minute access tokens; refresh rotation with reuse detection; logout revokes; CSRF enforced on cookie routes; join endpoint lockout-tested |
| **WS3** | Tenant authorization and RLS                  | Cross-tenant consent/attempt/mastery IDORs, RLS policy gaps, unauthenticated join vs `FORCE RLS`, diagnostic consent bypass, Postgres test gap                | Not started | Postgres 16 CI; non-owner RLS tests; teacher A → student B returns 403; diagnostics require consent                                          |
| **WS4** | Evidence integrity                            | Label-leaking `/admin/evaluation`, synthetic fallback, mock tutor default, unsupported calibration claims, claim-vs-reality table                             | Not started | Pre-answer predictions only; synthetic data explicitly labelled; production refuses mock provider; README claims match code                  |
| **WS5** | Adaptive engine correctness                   | Two BKT implementations, duplicate `/v1` mount, ranker ignoring graph/order, fixed 20-item CAT, unseeded RNG, no model versioning                             | Not started | One BKT path; one attempt write path; prerequisite gaps affect selection; reproducible diagnostics; model version stored                     |
| **WS6** | Production readiness                          | CSP nonce, CD theatre, Docker context mismatch, untracked `uv.lock`, rate-limit/NAT failure, sync transaction poisoning, health leak, in-memory observability | Not started | Production build smoke test; honest CD or no CD claim; reproducible Python build; 40-student NAT load test; sync partial-failure test        |
| **WS7** | Content and pedagogy                          | 1.33 questions/skill, generated meta-questions, no SME review, no item statistics, Hindi QA, copyright review                                                 | Not started | 100% SME-reviewed items; answer keys validated; item p-values/discrimination; legal review recorded                                          |
| **WS8** | Product and compliance                        | Verifiable guardian consent, DPIA/DPO/school DPA, erasure semantics, teacher workflow, efficacy study, pricing/LOIs                                           | Not started | Verified consent; 3-school pilot; preregistered efficacy analysis; 5 LOIs                                                                    |

## WS1 — completed

### Changes

- [x] Removed the `mock_token_` authentication branch from `apps/api/app/api/deps.py`. All bearer tokens now go through normal JWT decode, type, subject, signature, and expiry checks.
- [x] Removed `loginAsDemoUser` and all `mock_token_` minting from `apps/web/src/lib/profiles-data.ts`.
- [x] Changed `setActivePersona` to store a display-only `bodhai_active_persona` value; it no longer writes `bodhai_user` or `bodhai_access_token`.
- [x] Removed the `mock_token_` heuristic from `packages/api-client/src/client.ts`.
- [x] Removed the hardcoded `Password@123` fallback from the login page; the retry action now uses the password the user entered.
- [x] Changed `apps/api/scripts/seed_5_teachers_cohorts.py` to require `BODHAI_SEED_TEACHER_PASSWORD` (12+ chars) and `BODHAI_SEED_STUDENT_PIN` (6–8 digits).
- [x] Changed `apps/api/scripts/seed_real_cohort.py` to require `BODHAI_SEED_STUDENT_PIN`.
- [x] Added `test_mock_tokens_are_rejected` to `apps/api/tests/test_auth_security.py`.

### Verification

- `uv run pytest tests/test_auth_security.py tests/test_deps_and_security.py -q --no-cov` → **26 passed**
- `pnpm --filter @bodhai/web typecheck` → **passed**
- `uv run ruff check` on the modified Python files → **passed**
- `uv run mypy app/api/deps.py` → **passed**
- `pnpm exec eslint` on the modified TypeScript files → **passed**
- Prettier check on the modified TypeScript files → **passed**
- Full test suite and Postgres-backed tests were **not** run in this step.

### Follow-up carried into WS2

The backdoor is gone. The remaining session weaknesses were completed in WS2. The seed scripts still assign one shared student PIN to every seeded account; replace this with per-student onboarding credentials before any real cohort.

## WS2 — completed

### Changes

- [x] Changed access tokens to a 15-minute lifespan and added a `sid` session claim.
- [x] Made the session claim mandatory: access tokens without a live server-side session are rejected, so pre-deploy tokens require one re-login.
- [x] Persisted server-side `sessions` rows with a SHA-256 refresh-token hash, IP address, user agent, and expiry.
- [x] Added refresh rotation: the old session is revoked, and replaying a consumed token revokes every session for that user.
- [x] Logout now deletes the active session server-side before clearing cookies; a delayed logged-out token cannot trigger global revocation.
- [x] `get_current_user` rejects revoked, expired, or mismatched sessions.
- [x] Enforced double-submit CSRF on cookie-authenticated mutations; Bearer requests and public login/signup/join/refresh endpoints remain exempt.
- [x] Removed the access token from `localStorage`; HttpOnly cookies are primary and the access token is kept in memory only. Legacy localStorage tokens are purged on load.
- [x] Added `credentials: 'include'`, CSRF headers, refresh-on-401 retry, in-tab single-flight refresh, and Web Locks cross-tab refresh serialization to the web API client.
- [x] `/auth/student/join` now checks lockout, increments failed attempts, and audits failed joins.

### Verification

- `uv run pytest -q --no-cov` (full API suite) → **238 passed**
- `uv run pytest tests/test_auth_security.py tests/test_deps_and_security.py -q --no-cov` → **29 passed**
- `uv run ruff check` on the modified Python files → **passed**
- `uv run mypy app/api/v1/auth.py app/api/deps.py app/core/security.py` → **passed**
- `pnpm --filter @bodhai/web typecheck` → **passed**
- `pnpm --filter @bodhai/api-client typecheck` → **passed**
- `pnpm --filter @bodhai/api-client test` → **16 passed**
- `pnpm --filter @bodhai/web exec vitest run src/__tests__/auth-redirect.test.ts` → **9 passed**
- ESLint and Prettier on the modified files → **passed**
- Postgres-backed tests were **not** run in this step; the full suite used in-memory SQLite only.

### Exit gate

The auth tests cover mandatory session claims, 15-minute tokens, rotation, replay revocation, logout revocation, cookie refresh, CSRF enforcement, and student-join lockout. No migration is required because the `sessions` table already exists in migration 0001. Postgres-backed session behavior remains part of the WS3/WS6 database verification.

## Recommended sequence

1. **WS3** — tenant authorization and RLS. Do this before any multi-school pilot.
2. **WS4** — evidence integrity. Remove or label every metric that is not real before showing the product to a school or investor.
3. **WS5** — engine correctness. Collapse the two BKT paths and fix the ranker before making adaptive claims.
4. **WS6** — production readiness. Prove the build, deploy, rate limits, and sync path.
5. **WS7–WS8** — content, efficacy, consent, and commercial validation.

## Verification rules

- A workstream is not done until its exit gate has a command or artifact that proves it.
- Security fixes require a regression test that fails on the old code.
- Database changes require a Postgres 16 test, not SQLite only.
- Claims in `README.md` must be removed or backed by a linked artifact before a pilot.
