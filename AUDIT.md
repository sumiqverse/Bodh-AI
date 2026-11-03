# BodhAI — Independent Technical, Security, and Product Audit

> **Date:** 3 November 2026  
> **Repository:** `C:\Users\sumit\OneDrive\Desktop\projects\Edu`  
> **Mode:** Read-only code review. No application code was modified. This report is the only artifact created.  
> **Important:** The working tree had 40+ uncommitted modified files at review time. Findings refer to that state, not a tagged commit or a clean branch.

---

## Contents

1. [Audit scope and method](#audit-scope-and-method)
2. [Verdict](#verdict)
3. [The five biggest weaknesses](#the-five-biggest-weaknesses)
4. [Detailed audit](#detailed-audit)
   - [What is genuinely strong](#what-is-genuinely-strong)
   - [Security findings](#security-findings)
   - [Data model and database](#data-model-and-database)
   - [Adaptive engine and pedagogy](#adaptive-engine-and-pedagogy)
   - [Content](#content)
   - [Frontend, PWA, and accessibility](#frontend-pwa-and-accessibility)
   - [Testing, CI, and observability](#testing-ci-and-observability)
   - [Documentation integrity](#documentation-integrity)
   - [Product and market critique](#product-and-market-critique)
5. [Missing requirements and gaps](#missing-requirements-and-gaps)
6. [Prioritized action plan](#prioritized-action-plan)
7. [30/60/90-day plan](#306090-day-plan)
8. [Validation plan and measurable success criteria](#validation-plan-and-measurable-success-criteria)
9. [Facts, judgments, and unknowns](#facts-judgments-and-unknowns)
10. [Bottom line](#bottom-line)

---

## Audit scope and method

This review covers the API, adaptive engine, authentication and authorization, database schema and migrations, test suite, CI/CD, web client, PWA/offline layer, content packs, and documentation.

I did not modify application code, run the test suite, build the app, run migrations, perform dynamic security testing, or open any `.env*` file. The audit was performed by reading files and running only read-only inspection commands (`git ls-files`, `git status`, `wc`, `grep`, and a read-only Python JSON inspection).

**Evidence convention:**

- **Verified** — directly observed in the repository.
- **Judgment** — an inference from code and product context.
- **Unknown** — not verified; needs a runtime test, deployment inspection, or user confirmation.

---

## Verdict

This is an unusually broad, well-structured prototype with real engineering effort. It is also **not safe to put in front of real students**, and several advertised capabilities are not implemented, are mocked, or produce misleading evidence.

The gap between the README and the running system is the single biggest systemic risk. The project has the shape of a production platform but the verification level of a demo. The most urgent work is not more features; it is removing an authentication backdoor, closing cross-tenant data access, replacing fabricated evidence with honest measurement, and proving the production path.

---

## The five biggest weaknesses

### 1. Authentication is bypassable by design — critical

`apps/api/app/api/deps.py:74` accepts any bearer token beginning with `mock_token_`:

```python
if token.startswith("mock_token_"):
    raw_id = token[len("mock_token_"):].strip()
    ...
    user = await user_repo.get_by_id_with_role(target_uuid)
    ...
    user = await user_repo.get_by_username(cleaned)
    ...
    stmt = select(User)...where(
        User.username.ilike(f"%{cleaned}%") | User.email.ilike(f"%{cleaned}%")
    ).limit(1)
```

There is **no environment guard, no signature check, no expiry, and no role check**. Anyone who can reach the API can send `Authorization: Bearer mock_token_<any-user-uuid>` and become that user. If the token is not a UUID, it resolves by username and then by a substring match over username and email — so a token containing an admin's username or UUID authenticates as that admin.

The frontend makes this worse:

- `apps/web/src/lib/profiles-data.ts:2337` mints `mock_token_${account.user.id}` for demo accounts.
- `packages/api-client/src/client.ts:1501` has a heuristic treating strings starting with `mock_token_` as tokens.
- Demo teacher accounts include institutional-looking email addresses and IDs, making the backdoor look like a legitimate demo feature.

The backdoor is not a test-only branch; it is part of the shipped client design.

**Related authentication defects:**

- **24-hour access tokens.** `config.py` sets `access_token_expire_minutes=1440`, while `security.py`'s docstring says 15 minutes and `/auth/refresh` advertises 15-minute access tokens.
- **No revocation.** `/auth/logout` only deletes cookies. The `Session` model exists but no code path uses it to revoke a token. Refresh token rotation issues a new token but the old one remains valid until expiry; there is no reuse detection or `jti` denylist.
- **Tokens in `localStorage`.** `api-client.ts` reads `bodhai_access_token` from `localStorage`; any XSS becomes a 24-hour account takeover. The API's HttpOnly cookies are not the session mechanism the web app actually uses.
- **`/auth/student/join` bypasses lockout.** `student_join` verifies an existing username + PIN and returns a token, but never calls `record_login_failure`, never checks `locked_until`, and never checks `is_active`. A 4-digit PIN can be brute-forced through this endpoint with only the global IP limit; the error also confirms that a username exists.
- **Plaintext fallback in `verify_secret`.** If the stored value is not Argon2, the function falls back to `hashed == plain` (`security.py`). Test fixtures rely on this (`factories.py` uses `hashed_password="mock_argon2_hash"`), which couples the test suite to an insecure production function.
- **Supabase token handling.** In `local`/`development`, an unverified JWT is accepted if `supabase_jwt_secret` is unset. In production, an empty Supabase secret falls back to the app's `secret_key`; `verify_aud` is disabled; and `/auth/supabase` auto-creates a **teacher** account for any Supabase email without checking `email_verified` or school affiliation.

**Why this fails:** one `curl` compromises every student, teacher, and admin record. For a product handling minors' data, this is not a bug to schedule; it is a stop-ship defect and a likely DPDP breach.

---

### 2. Tenant isolation is app-layer only, and the RLS layer is unverified and self-contradictory — critical

The application has direct cross-tenant IDORs:

- `apps/api/app/api/v1/consents.py` uses `_assert_student_access`, which only restricts users whose role is `student`. **Any authenticated teacher can create, read, or withdraw guardian consent for any student UUID**, and `GET /consents/student/{id}` returns the guardian's name and phone number.
- `apps/api/app/api/v1/attempts.py` uses the same helper, so **any teacher can read any student's full attempt history** by UUID.
- `apps/api/app/api/v1/adaptive.py:get_student_mastery` explicitly allows teachers/admins to read any student's mastery.

Postgres RLS is supposed to be the second line of defense, but the implementation has a dilemma:

- `set_rls_context` is only called inside `get_current_user`. `student_join` is unauthenticated and queries `classes` by join code. The `classes_teacher_policy` allows only `teacher_id = app.user_id` or `role = 'admin'`. With `FORCE ROW LEVEL SECURITY` and a non-bypass DB role, **join-code lookup returns zero rows and student onboarding fails**. If the app connects as a superuser/`BYPASSRLS` role, the policies are decorative. Either outcome is unacceptable; the repo does not document which DB role is used.
- No policy lets a student read their own class row, so student-facing class reads are also at risk.
- RLS covers `classes`, `enrollments`, `attempts`, `mastery`, and `consents` only. `users`, `questions`, `sync_events`, `audit_logs`, and others have no RLS.
- `test_rls.py` does not test RLS. It mocks `set_config` and asserts that repository WHERE clauses isolate teachers on SQLite. It would pass with RLS completely disabled.
- `conftest.py` uses `Base.metadata.create_all` on in-memory SQLite. CI has **no Postgres service**. Migrations, RLS, partitioning, JSONB, pgvector, and partial unique indexes are never exercised.

There is also a schema-level red flag: `Attempt` declares `idempotency_key` as globally `unique=True` while declaring `postgresql_partition_by="RANGE (created_at)"`. PostgreSQL requires unique constraints on a partitioned table to include the partition key. As declared, `create_all()` on Postgres would fail; if the migration works around it with per-partition indexes, the ORM and DB diverge and idempotency is not globally enforced. SQLite cannot detect this.

**DPDP compliance is weaker than the documentation claims:**

- Guardian consent is self-asserted: the student or any teacher types a guardian name and phone; there is no OTP, no verified guardian identity, and no age assurance.
- The diagnostic flow bypasses the consent gate entirely. `AdaptiveService.start_diagnostic` and `progress_diagnostic` insert `Attempt` and `Mastery` rows without calling `has_consent`; only the practice-attempt paths enforce it. A student with no consent can still take a diagnostic and have data recorded.
- Erasure (`anonymize_student`) anonymizes the profile but leaves attempts, mastery, and audit logs linked to the user UUID; there is no documented legal basis for retaining them and no retention job evidence.
- No DPIA, DPO, school DPA, breach-notification workflow, or data-localization assessment is in the repo.

**Why this fails:** a single teacher account from School A can read guardian phone numbers and learning histories from School B. That is a procurement blocker and a regulatory incident, not a feature gap.

---

### 3. The evidence layer is fabricated or mocked — existential for credibility

Three separate mechanisms make the product look more validated than it is.

#### a) The evaluation dashboard is label leakage

`apps/api/app/api/v1/admin.py:get_admin_evaluation` builds predictions as:

```python
pred_prob = 0.75 if is_correct else 0.35
```

The "prediction" is computed **from the answer label**. ROC-AUC will be near 1.0 and the calibration curve will look excellent, because the model has been given the answer. If fewer than 10 attempts exist, it silently generates synthetic random data and returns it without a `synthetic` flag.

The README claims "ROC-AUC and ECE of next-response predictions over real attempts using student-level holdout splits." This endpoint cannot support that claim. If shown to a school or investor, it is misleading regardless of intent.

#### b) The AI tutor defaults to a mock

`tutor_llm_provider` defaults to `"mock"`, and `get_llm_provider` silently falls back to `MockLLMProvider` if `openai` is selected without a key. The mock returns the same canned paragraph for every query. There is no production guard, no visible "AI unavailable" state, and no health indicator. A deploy that forgets the env var ships a tutor that says nothing useful, while all tests pass.

#### c) The question bank is largely generated

`apps/api/content/class8-maths/pack.json` has **150 skills but only 200 questions** (1.33 per skill). `apps/api/alembic/data/0012_unreviewed_generic_questions.json` is 404 KB of templated meta-questions such as "which mathematical property defines 'Place Value…'?"

Migration `0012` correctly demotes those published items back to `draft`, which is good remediation — but the generator remains the seed path, and there are no subject-matter-expert review artifacts, answer-key validation reports, or item statistics in the repo. "NCERT-aligned" and "calibrated" are marketing claims, not verified mappings.

The same pattern appears elsewhere: CI/CD claims, OpenTelemetry, offline encryption, SLOs, and WCAG conformance (see [Documentation integrity](#documentation-integrity)).

**Why this fails:** the product's defensibility depends on measured learning outcomes. If the only available "evidence" is label leakage and mock outputs, a serious buyer will discover it in due diligence, and the credibility loss will be permanent.

---

### 4. The adaptive engine has divergent write paths and unsupported claims — the core product is not defensible

- **Two BKT implementations.** `app/engine/bkt.py` uses `p_init=0.30`, `p_transit=0.10`, rapid-guess weighting, and EIG. `app/services/mastery_service.py` uses `p_init=0.10`, `p_transit=0.15`, no rapid-guess handling, and a different confidence formula. `/api/v1/attempts` goes through `AttemptService` → `MasteryService`; the adaptive routes go through `AdaptiveService` → `MasteryStateMachine`. The same student answering the same question gets a different `p_mastery` depending on which endpoint the client calls.
- **A duplicate API surface.** `main.py` mounts `adaptive_direct_router` at `/v1` in addition to the normal `/api/v1` router. `/api/v1/attempts` is shadowed by the first-registered attempts router, so the duplicate lives at `/v1/attempts`. It is undocumented and may bypass future middleware or monitoring.
- **The ranker ignores the prerequisite graph.** `RecommendationRanker.select_next_item` contains `_ = (curriculum_skills, edges)` — the graph is explicitly discarded. `AdaptiveService.get_next_item` never sets `CandidateItem.curriculum_order`, so `curriculum_alignment` is a constant `1 - 1/150 ≈ 0.993` for every item; 10% of the ranking score is noise. `compute_item_score` is unused. The README's "prerequisite-aware" recommendation claim is not implemented on the practice path.
- **The "CAT" is fixed-length.** `DiagnosticConfig(min_questions=20, max_questions=20, targeted_followup_after=15)`. The uncertainty-based stopping rule can never trigger before the max, so it is a fixed 20-item test with adaptive item selection. That is a legitimate CAT, but the adaptive-length and uncertainty-termination claims are false as wired.
- **Unseeded randomness.** `random.shuffle` and `random.choice` make diagnostics non-reproducible; the same student can get different sessions, and debugging or auditing a result is impossible. Tests can flake.
- **No calibration.** `em_fitting.py` exists and is tested, but no service imports `fit_bkt_em`; all items share `P(S)=0.10`, `P(G)=0.20`, `P(T)=0.15`. `Question.difficulty` is an integer 1–5, not calibrated difficulty/discrimination. There is no item-parameter table and no calibration job. The UI repeatedly says "calibrated questions"; that is not supported.
- **"Confidence" is a count, not confidence.** `MasteryService` uses `min(1.0, 0.4 + 0.1 * min(attempts_count, 6))` → 1.0 after six attempts regardless of correctness or variance. `AdaptiveService` uses an exponential count-based formula. Teacher dashboards present this as statistical confidence.
- **Two correctness paths.** `AttemptService` evaluates only `question.translations[0]` and only MCQ options; it ignores `verified_answer`, so numeric and short-text questions are always marked wrong. `AdaptiveService` handles the language-specific translation and `verified_answer`. Same question, different grading.
- **Test mode is client-controlled.** `TutorQueryRequest.is_test_mode` is supplied by the client. A student can set it to `false` during an exam and get tutor help. `TestModeProtector.is_answer_revealed` and `PromptInjectionDefender.validate_output` are only called from tests/eval scripts, never in the request path.
- **No model versioning.** `Mastery` and `Attempt` do not store the BKT parameters, engine version, or prediction that produced the state. After a code change, a student's mastery cannot be reproduced or audited.
- **Simulation is not validation.** `simulation_report.md` shows synthetic personas; it demonstrates that the code runs, not that learning improves. There is no efficacy study, no pre/post data, no control group, and no external review.

**Why this fails:** the product's core promise is "adaptive mastery learning." Right now the engine is a reasonable prototype with inconsistent semantics, uncalibrated parameters, and no evidence that its recommendations improve outcomes. A teacher who sees contradictory mastery values will stop trusting the dashboard; a researcher will reject the claims.

---

### 5. The production path is unproven and in places non-functional — a pilot cannot run reliably

- **CSP likely breaks the production build.** `apps/web/src/middleware.ts` generates a nonce and sets `Content-Security-Policy` only on the response; it sets `x-nonce` but no layout/component reads it. `next.config.mjs` does not set CSP. Next.js needs the CSP on the request headers (or a readable nonce) to attach the nonce to its bootstrap scripts. In production `script-src 'self' 'nonce-…' 'strict-dynamic'`; with `strict-dynamic`, `'self'` is ignored in CSP3 browsers, so un-nonced Next scripts are blocked. By inspection this is a high-probability blank-page/hydration failure; one production-mode browser test will settle it. `style-src 'unsafe-inline'` also contradicts the "zero unsafe-inline" claim.
- **CD is theater.** `.github/workflows/cd.yml` builds images, then:
  - "Run Staging Migrations" is an `echo` with the Alembic command commented out.
  - "Deploy to Cloud Run / Container Host" is `echo "Simulating dispatch…"`.
  - "Health Check Verification Probe" is commented out.
    The README calls this "automated staging/production delivery." It deploys nothing.
- **The Docker build is broken by context.** CD runs `docker build --file apps/api/Dockerfile ... .` from the repo root, while the Dockerfile does `COPY pyproject.toml README.md ./`. There is no root `pyproject.toml`; it lives in `apps/api`. The API image build fails at that `COPY`. The web Dockerfile has the same context risk.
- **Python builds are not reproducible.** `apps/api/uv.lock` exists on disk (632 KB) but is **not tracked by git**; CI's `uv sync` and the Dockerfile's `uv pip install -r pyproject.toml` therefore resolve unpinned `>=` dependencies on every run. A new library release can break production without a code change.
- **Rate limiting will break the first classroom.** There is one global dependency: 60 requests/minute per IP for the entire API. A class of 40 students behind one school NAT doing 2–3 requests/minute each is 80–120 requests/minute → 429s for everyone. `X-Forwarded-For` is trusted without validating the proxy chain, so the limit is trivially spoofed. If Redis is unavailable, the limiter fails **open** (all requests allowed), so it is not a DoS control. There are no per-user, per-route, login-specific, or tutor-specific limits.
- **Batch sync has a transaction-poisoning bug.** `SyncService.process_batch` catches exceptions per event but does not use a savepoint or rollback. On Postgres, the first constraint error aborts the transaction; subsequent queries and the final commit fail, the client gets a 500, and retries the batch forever. It also returns `error=str(exc)` to the client, leaking schema and constraint details. The clock-skew comment says timestamps are "clamped to server time," but the code only adds a flag to a copied payload; `client_timestamp` is still used for mastery, so a student can backdate or future-date attempts.
- **In-memory state does not survive workers or deploys.** Tutor rate limiting, budget tracking, circuit breaker, response cache, and API metrics are per-process. The API Dockerfile runs `uvicorn --workers 2`, so the budget is effectively 2× and resets on every deploy; `_user_windows` and the response cache grow without eviction. The metrics registry's `request_counts` keyed by full path (including UUIDs) also grows without bound.
- **Health checks lie.** `apps/web/src/app/api/health/route.ts` always returns `status: "healthy"` and HTTP 200, even when the DB is disconnected, and exposes `SELECT version()`, `NEON_AUTH_BASE_URL`, branch, and raw error messages. It also creates a second DB access path from the web server, bypassing the API's authorization/RLS (currently only for health, but `getNeonSql` is exported).
- **Observability is overstated.** `configure_telemetry` never initializes OpenTelemetry; `pyproject.toml` has no `opentelemetry-*` dependency; `otel_exporter_otlp_endpoint` is unused. Metrics are in-process lists/dicts with no `/metrics` scrape endpoint. Sentry is real; the 99.5% availability and p95<300 ms SLO claims are not measured by anything in this repo.
- **Health/backup/restore claims are unverified.** Backup/restore scripts and runbooks appear to exist, but there is no committed drill output with RPO/RTO, checksums, or a timed restore. Treat as unknown until demonstrated.

---

## Detailed audit

### What is genuinely strong

This is not a low-effort prototype. The monorepo is organized; the FastAPI layer uses Pydantic v2, SQLAlchemy 2 async, Alembic, Argon2, RFC 7807 errors, request IDs, security headers, payload limits, and a structured repository/service split.

The test suite has **235 backend test functions**, Hypothesis property tests, an answer-leak test suite, an RBAC matrix, migration tests, and offline sync/outbox tests. The web app has i18n (English/Hindi), a PWA/service worker, IndexedDB outbox, a shared-device logout modal, feature flags, and an accessibility skip link. The content pack has a JSON schema, a review queue, version history, and an import pipeline. The audit log, consent model, data export, and DPDP endpoints show the right instincts.

The problem is not competence; it is **scope and verification**. There are more surfaces than the team can make trustworthy, and the documentation repeatedly describes the intended system rather than the implemented one.

---

### Security findings

Beyond the top five:

| Severity | Finding                                                                    | Evidence                                                                                         |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Critical | `mock_token_` unsigned auth, no environment guard                          | `apps/api/app/api/deps.py:74`; demo tokens in `apps/web/src/lib/profiles-data.ts:2337`           |
| Critical | Cross-tenant consent/attempt/mastery access                                | `apps/api/app/api/v1/consents.py`, `attempts.py`, `adaptive.py`                                  |
| High     | Student join bypasses lockout and enables PIN brute force                  | `apps/api/app/api/v1/auth.py:student_join`; 4-digit PIN; no failure counter                      |
| High     | 24-hour access tokens, no revocation, localStorage                         | `apps/api/app/core/config.py`; `apps/web/src/lib/api-client.ts`; logout only deletes cookies     |
| High     | Plaintext credential fallback                                              | `apps/api/app/core/security.py:verify_secret`                                                    |
| High     | RLS untested and incompatible with unauthenticated join                    | `alembic/versions/0002_auth_classes_rls.py`; `tests/test_rls.py`; `tests/conftest.py`            |
| High     | Diagnostics bypass guardian consent                                        | `apps/api/app/services/adaptive_service.py:start_diagnostic/progress_diagnostic`                 |
| High     | CSP nonce not propagated                                                   | `apps/web/src/middleware.ts`; `apps/web/src/app/[locale]/layout.tsx`; `apps/web/next.config.mjs` |
| Medium   | CSRF double-submit is dead code                                            | `apps/api/app/api/deps.py:verify_csrf` used only in `tests/test_deps_and_security.py`            |
| Medium   | CORS defaults include localhost/testserver; no production validation       | `apps/api/app/core/config.py`; `apps/api/app/main.py`                                            |
| Medium   | Payload limit trusts `Content-Length`; chunked/lying headers bypass        | `apps/api/app/core/middleware.py`                                                                |
| Medium   | Health route leaks DB/auth metadata; always 200                            | `apps/web/src/app/api/health/route.ts`                                                           |
| Medium   | Sync leaks internal exception strings                                      | `apps/api/app/services/sync_service.py`                                                          |
| Medium   | Tutor content filter over-blocks curriculum and mishandles self-harm       | `apps/api/app/services/tutor_security.py`                                                        |
| Medium   | Tutor test mode is client-controlled; answer-leak guards unused            | `apps/api/app/services/tutor_service.py`; `tutor_security.py`                                    |
| Medium   | Rate limiter trusts `X-Forwarded-For`; fails open                          | `apps/api/app/core/middleware.py`                                                                |
| Low      | `X-Request-ID` accepts arbitrary client value                              | `apps/api/app/core/middleware.py`                                                                |
| Low      | Teacher signup open; Supabase auto-creates teachers; no email verification | `apps/api/app/api/v1/auth.py`                                                                    |
| Low      | Join codes never expire unless manually rotated                            | `apps/api/app/api/v1/classes.py`; join code generation                                           |

#### Tutor-specific concerns

The content filter rejects `"sex"`, `"nudity"`, `"drugs"`, `"kill"` by keyword. That will block legitimate Class 8–10 science: adolescence/reproduction, medicines, "killer whale," and similar. More seriously, a child expressing self-harm gets a generic content refusal rather than a safeguarding escalation.

The prompt-injection regexes are trivially bypassed by paraphrase or transliteration; the real defense (`validate_output`) is never called. The "Socratic" response always returns the same `scaffolded_hint` and `follow_up_question` regardless of content. This is not a tutor; it is a retrieval-and-refusal pipeline around a canned answer.

The tutor's fallback accepts a client-supplied `question_id` and returns a static worked solution. Verify that it checks question publication status and student/class ownership; otherwise it is another answer-leak path.

---

### Data model and database

- **Partitioning/unique conflict** as described above. Verify on Postgres 16 with a real migration, not `create_all`.
- **No Postgres in CI.** All 235 tests run against SQLite by default; `TEST_DATABASE_URL` is optional and not set in `ci.yml`. The production schema path is effectively untested.
- **`idempotency_key` is globally unique.** Two students cannot reuse the same key; a client-generated UUID collision is negligible, but a malicious student who learns another's key can preempt or block it. Consider scoping to `(student_id, idempotency_key)`.
- **`SyncEvent.client_event_id` is globally unique**, not scoped to student; the duplicate check is global. Same preemption issue, plus a minor existence oracle.
- **No pagination** on `GET /attempts/student/{id}` (returns all attempts) or several admin/teacher list endpoints; a long-tenured student can produce an unbounded response.
- **Weak response schemas**: `list[dict[str, object]]` and `dict[str, Any]` endpoints weaken OpenAPI, validation, and client typing.
- **No `model_version`/`params_hash`** on `Attempt` or `Mastery`; no way to reproduce a state.
- **Soft delete + unique identifiers**: anonymization sets `username` to `anon_<8hex>` and `email=None`; re-registration with the same email is possible, and the old audit trail remains linked by UUID. This may be acceptable under a documented pseudonymization policy, but no policy is documented.
- **Partial unique indexes** for `mastery` are a sensible design, but they are not exercised on Postgres in CI.
- **`DiagnosticSession.snapshot`** stores full engine state, including question options with `is_correct`, in JSONB. It is server-side, but it is sensitive; any debug/admin endpoint that exposes snapshots becomes an answer leak.
- **No cleanup job** for completed diagnostics or old sync events; the tables grow with usage.

---

### Adaptive engine and pedagogy

The engine is the most interesting part of the project and the most over-claimed. BKT itself is implemented correctly in `engine/bkt.py` (posterior, transition, EIG, entropy). The state machine, hint ladder, root-cause traversal, and diagnostic item selection are thoughtful. But:

- The **service wiring** undermines the math: two implementations, two endpoints, different priors, no calibration, and unseeded randomness.
- The **ranker** is a reasonable multi-objective heuristic, but the prerequisite graph is discarded on the practice path, `curriculum_order` is never populated, and the weights are hand-set, not learned or validated.
- The **diagnostic** is a fixed 20-item test; its stopping rule is inert. It may still be pedagogically useful, but call it what it is.
- **No spaced-repetition scheduler.** The ranker penalizes recent skills, but there is no SM-2/FSRS-style review scheduling, no forgetting-curve model, and no evidence that the recency weights improve retention. The docs call it "spaced practice"; it is a heuristic penalty.
- **No misconception model.** "Root cause" is prerequisite traversal plus mastery thresholds, not diagnosis of a specific misconception. That is fine if described honestly; it is not fine if sold as cognitive diagnosis.
- **No efficacy evidence.** The simulation report is synthetic; there is no pre/post study, no control group, no delayed retention test, no effect size. The claim "adaptive mastery learning" is a hypothesis, not a result.
- **No teacher override/audit.** Teachers cannot correct a mastery state or annotate a recommendation; there is no audit trail for algorithmic decisions beyond generic logs.
- **No explainability for parents.** The rationale strings are internal; parent-facing explanations are marketing copy, not model explanations.

---

### Content

- 200 questions / 150 skills is not enough for sustained practice. The ranker excludes attempted questions and then resets when exhausted, so students will see repeats. A 20-question diagnostic consumes 10% of the entire bank.
- The generated questions are templated meta-questions, not authentic assessment items. The migration that demotes them is a good recovery, but the generator is still the seed path.
- There is no visible item-review evidence: no reviewer sign-off, no answer-key validation, no distractor analysis, no p-values/discrimination, no Hindi equivalence review, no readability check, no board-exam format alignment.
- **Copyright is an open legal risk.** NCERT textbooks and questions are not automatically licensed for commercial derivative use. "Aligned with NCERT" is safer than "reproduced from NCERT," but the generated paraphrases and any copied prompts need legal review before sale. This is an unknown, not an assertion.
- Hindi content exists, but code-mixed Hinglish — the actual classroom language — is not handled. The UI is bilingual; the pedagogical content quality in Hindi is unverified.
- The content importer and schema are solid infrastructure, but infrastructure is not content. The hard part is expert review and item calibration, and there is no evidence of either at scale.

---

### Frontend, PWA, and accessibility

- **Offline "encryption" is false.** `apps/web/src/lib/offline/db.ts` is plain Dexie/IndexedDB. The pack type includes an optional `correctAnswer` per question, so the design permits answer keys on the device. If the downloader populates it, a student can read answers in DevTools; if it does not, offline feedback is delayed until sync. Either way, the README's "Encrypted IndexedDB" claim is unsupported.
- **Shared-device logout is incomplete.** `clearAuthSession` clears `localStorage`, `sessionStorage`, and cookies, but does **not** clear the Dexie lesson packs, offline mastery, or outbox. On a shared tablet, student A's pending attempts can be synced under student B's token, and A's offline mastery remains visible. This is a privacy and data-integrity bug, not just a UX gap.
- **Session cookies are spoofable by design.** `bodhai_logged_in` and `bodhai_user_role` are set by JavaScript and used by middleware for redirects. They are not authorization (the API still checks the token), but they are not a session either; an attacker can set the admin cookie and get the admin shell.
- **`getStatusSync()` always reports `pendingCount: 0`**, while the async `getStatus()` is correct. Any UI using the sync variant will show "0 pending" while offline events are queued.
- **Contrast fails WCAG AA.** The primary CTA is white text on `#E8800A`. Approximate relative luminance is 0.326, giving a contrast ratio of about **2.8:1** — below 4.5:1 for normal text and below 3:1 for large text. `design.md` codifies this token for "Continue" and play buttons. The "WCAG 2.2 AA" claim is therefore false for the most important control in the product. An axe test may not catch it if the button is not rendered in the tested state or is treated as large text.
- **Leaderboards for minors.** The design features a global rank and named top learners. Public ranking of children is a safeguarding/ethics issue, not just a gamification choice; it needs school policy, opt-out, and parental consent. The product currently optimizes the student's dopamine loop, not the buyer's outcome.
- **`next.config.mjs` branches `output: 'standalone'` on `process.platform !== 'win32'`**, so a Windows build produces a different artifact than Linux CI. Use an explicit env var; don't make build output OS-dependent.
- **i18n bundle size.** `NextIntlClientProvider` receives the full message dictionary; as the dictionary grows, every page ships the whole thing to the client. Consider splitting by namespace.
- **`sw.js` caching needs review.** A service worker that caches authenticated pages or API responses on a shared device can leak one student's data to the next. Verify cache keys and logout behavior.

---

### Testing, CI, and observability

- **Coverage is not correctness.** 85% coverage with SQLite and mocked RLS does not prove the production path. The highest-risk paths — `mock_token_`, cross-tenant access, CSP, CSRF, rate limits, refresh revocation, sync partial failure, Postgres migrations — have no meaningful tests.
- **`test_benchmark_latency` is not an API benchmark.** It measures the pure-Python ranker with thresholds of 100 ms average / 750 ms p99, not the API, database, or network. It cannot support the p95<300 ms claim, and it asserts on a shared CI runner (flaky).
- **The E2E claim is inaccurate.** CI installs only Chromium (`npx playwright install --with-deps chromium`), while the README claims Chromium, Firefox, and WebKit. Either the config has three projects and CI fails, or the claim is false.
- **SAST is non-blocking.** Semgrep uses `continue-on-error: true`; the security job can be green with findings. Gitleaks and audits run, but there is no evidence in the repo of their current results.
- **No dependency pinning.** `apps/api/uv.lock` exists but is untracked; `pyproject.toml` uses `>=` ranges; the Dockerfile installs from `pyproject.toml`, not the lockfile. Builds are not reproducible.
- **No real observability.** No OTel SDK; in-process metrics per worker; no `/metrics`; no dashboard provisioning; no alert routing; no load-test results; no incident drill evidence. The runbooks are well-written, but they describe a system that is not instrumented to detect the incidents they cover.
- **No backup/restore evidence.** The scripts and runbook may exist; there is no committed restore drill with timestamps, checksums, RPO/RTO, or a row-count verification.
- **No test for the Postgres-specific answer.** The most important SQL in the product — RLS policies, partitioning, partial indexes, JSONB operators — is never run against Postgres in CI.

---

### Documentation integrity

| Claim                                           | What the code shows                                                   | Severity                       |
| ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| "Supabase Managed PostgreSQL"                   | Neon packages, `.neon`, `neon_auth_*` config, Neon health route       | Medium — architecture drift    |
| "OpenTelemetry"                                 | No OTel SDK/dependency; `configure_telemetry` only structlog + Sentry | High — false operational claim |
| "Encrypted IndexedDB"                           | Plain Dexie; optional `correctAnswer` on device                       | High — privacy claim           |
| "Zero unsafe-inline" / "nonced strict-dynamic"  | `style-src 'unsafe-inline'`; nonce not propagated to scripts          | High — likely broken prod CSP  |
| "Automated staging/production delivery"         | `cd.yml` echoes and comments out migrations/health checks             | High — false delivery claim    |
| "Cross-browser E2E (Chromium, Firefox, WebKit)" | CI installs Chromium only                                             | Medium                         |
| "99.5% availability, p95 < 300 ms"              | In-memory per-worker metrics; no load results; no SLO measurement     | High — unverifiable            |
| "ROC-AUC/ECE over real attempts"                | `pred_prob = 0.75 if is_correct else 0.35`; synthetic fallback        | Critical — misleading evidence |
| "IRT difficulty/discrimination calibration"     | Hardcoded BKT params; no item parameter table; EM fitter unused       | High — false capability        |
| "15-minute access token"                        | 1440 minutes (24h) in config                                          | Medium — security drift        |
| "WCAG 2.2 AA"                                   | Primary CTA contrast ≈2.8:1                                           | High — accessibility claim     |
| "Verified guardian consent"                     | Self-asserted form; diagnostics bypass consent                        | Critical — DPDP claim          |
| "Daily encrypted backups"                       | Scripts/runbook present; no drill evidence                            | Unknown — verify               |

---

### Product and market critique

The idea is plausible, but the current product is aimed at the wrong problem.

- **Buyer ≠ user.** A principal/trust buys; a teacher uses; a parent may pay; the student benefits. The current design optimizes the student's gamified dashboard (XP, streaks, rank), while the buyer cares about board results, teacher workload, parent complaints, and audit-proof privacy. Those are different products.
- **The market anchor is free.** DIKSHA/NCERT content, Khan Academy, and state portals set the price of content at zero. Established exam-prep brands own the Class 10/12 mindshare. A generic "adaptive LMS + AI tutor" is a feature bundle, not a wedge.
- **The AI tutor is not a moat.** It is a commodity wrapper around an LLM plus RAG. The moat, if any, is **verified content + teacher workflow + distribution + evidence of outcomes**. The current code has thin generated content, no efficacy evidence, and no distribution motion.
- **The offline PWA is the most differentiated idea** for rural/low-bandwidth schools — but it is also the hardest to secure (answer keys on device, shared tablets, sync conflicts) and the least tested. It needs device-management and privacy work before it is a selling point.
- **Scope is the enemy.** The repo contains an LMS, adaptive engine, AI tutor, offline PWA, teacher analytics, gamification, certificates, admin console, i18n, Terraform, and a design system. A small team cannot make all of those trustworthy. Every additional surface increases the security, content, and support burden.
- **Regulatory friction is underestimated.** Minors' data, verifiable parental consent, school DPAs, data localization, grievance officer, breach notification, and leaderboard ethics are not "later" items; they gate the first sale.
- **The best wedge** is narrow: one grade (Class 8), one subject (mathematics), one clear outcome (diagnose gaps → targeted practice → teacher sees class gaps), sold to affordable private schools in one region, with verified consent and offline support. Prove learning gains and teacher time savings there before expanding.

---

## Missing requirements and gaps

### Security and compliance

- No threat model, pentest, or security contact.
- No token revocation, session management UI, device list, or "sign out everywhere."
- No MFA for teachers/admins; no email verification; no password breach check.
- No per-account login throttling on all auth paths; `/student/join` bypasses lockout.
- No secret rotation evidence; `.env.production`/`.env.staging`/`.env.development` are tracked.
- No Postgres RLS test with a non-owner role; no decision on the DB role.
- No DPIA, DPO, school DPA, breach playbook, or retention enforcement evidence.
- No answer-key protection for offline packs; no shared-device data wipe.
- No content security review for user-generated question prompts or teacher imports.

### Data and engineering

- No Postgres CI; no migration up/down test on the production schema; no partition test.
- No model versioning/reproducibility for mastery; no audit of prediction inputs.
- No pagination on large lists; weak response schemas.
- No `uv.lock` in git; no reproducible Python build.
- No real CD; Docker context mismatch; no deploy verification.
- No load-test results; no SLO instrumentation; no `/metrics`; no alert routing.
- No backup/restore drill evidence.
- No data retention enforcement job evidence.
- No schema for item parameters, reviewer sign-off, or content provenance.

### Pedagogy and content

- No item calibration, p-values, discrimination, distractor analysis, or DIF.
- No efficacy study, control group, delayed post-test, or effect size.
- No spaced-repetition scheduler; no forgetting model.
- No misconception diagnosis; "root cause" is prerequisite traversal.
- 1.33 questions per skill; generated meta-questions; no SME review.
- No Hindi content QA; no Hinglish support; no board-exam format alignment.
- No copyright/licensing review for NCERT-derived content.
- No teacher override, correction workflow, or algorithmic audit trail.

### Product and operations

- No roster import (CSV/Google Classroom), no assignment builder at scale, no parent report, no WhatsApp communication.
- No low-end Android performance budget; no device management for shared tablets.
- No pricing, unit economics, school LOIs, pilot plan, support model, or content-ops cost model.
- No teacher override/audit for recommendations; no explainability for parents.
- No accessibility audit with a screen reader; contrast failure on primary CTAs.
- No onboarding for a teacher who has 45 minutes and 38 students.
- No plan for schools with intermittent connectivity and shared devices.

---

## Prioritized action plan

Priority is based on harm if unfixed; effort is rough; risk is the chance the fix introduces regressions or requires architectural change.

| Priority | Action                                                                                                                         | Impact              | Effort | Risk   | Acceptance criterion                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Remove `mock_token_` branch entirely; delete demo token minting; regenerate JWT secret                                         | Critical            | S      | Low    | `mock_token_*` returns 401 in every env; regression test; no demo token in client bundle                                   |
| **P0**   | Fix cross-tenant authz on consents, attempts, mastery; central policy helper                                                   | Critical            | M      | Medium | Teacher A gets 403 for Student B; matrix tests for student/teacher/admin across schools                                    |
| **P0**   | Disable fabricated evaluation; label synthetic data; implement pre-answer predictions                                          | Critical            | M      | Medium | AUC/ECE computed from pre-answer `p_mastery` + item difficulty; no label in features; `synthetic:false` only for real data |
| **P0**   | Disable mock tutor in production; fail fast if provider/key missing; wire output guard                                         | High                | S      | Low    | Production refuses to start with mock provider; `validate_output` called on every LLM response; visible fallback           |
| **P0**   | Remove/verify tracked `.env.*`; rotate anything real; scan git history                                                         | Critical            | S      | Low    | Gitleaks full-history clean; secrets in secret manager/CI only                                                             |
| **P0**   | Fix CSP nonce or drop strict CSP; production-mode smoke test                                                                   | High                | M      | Medium | Prod build loads with no CSP violations; scripts hydrate; test in CI                                                       |
| **P0**   | Enforce consent on diagnostics; block diagnostic start/answer without current consent                                          | Critical            | S      | Low    | Unconsented student gets 403 on start and progress                                                                         |
| **P1**   | Postgres 16 CI job with Testcontainers; migrations up/down; RLS tests with non-owner role                                      | High                | M      | Medium | Migration + RLS suite green on Postgres; join-code path works; student can read own class                                  |
| **P1**   | Token lifecycle: 15-min access, HttpOnly cookies, `jti` + `Session` revocation, refresh reuse detection, CSRF on cookie routes | High                | M      | Medium | Logout invalidates refresh; old refresh rejected; CSRF missing → 403                                                       |
| **P1**   | Per-user + per-IP + per-route rate limits; trusted proxy config; fail-closed on auth/tutor                                     | High                | M      | Medium | 40 students behind one NAT pass; spoofed XFF does not bypass; Redis down does not disable auth limits                      |
| **P1**   | Sync savepoints; no internal error leakage; server-side timestamp clamp; partial-failure tests                                 | High                | S      | Low    | One bad event does not fail the batch; retries idempotent; 24h offline replay succeeds                                     |
| **P1**   | Single BKT implementation and single attempt write path; remove `/v1` duplicate mount                                          | High                | M      | High   | Same answer → same mastery on all endpoints; OpenAPI shows one path                                                        |
| **P1**   | Fix ranker: set `curriculum_order`, use prerequisite edges, seed RNG, remove dead code                                         | High                | M      | Medium | Prerequisite gap changes next item; diagnostic reproducible with seed                                                      |
| **P1**   | Content review: SME sign-off for all 200 items; remove generator from seed; add item metadata                                  | High                | L      | Medium | 100% reviewed; answer keys validated; ≥5 items/skill/difficulty before adaptive claims                                     |
| **P1**   | Real observability: OTel SDK/exporter or remove claim; `/metrics`; external aggregation; SLO dashboard                         | Medium              | M      | Low    | Metrics survive restart and aggregate across workers; SLO computed from real traffic                                       |
| **P2**   | Efficacy study: 3–5 schools, n≥300, 8 weeks, pre/post + delayed test, preregistered                                            | Critical for claims | L      | High   | Effect size with 95% CI; attrition reported; independent review                                                            |
| **P2**   | Teacher workflow: roster import, assignment builder, parent report, WhatsApp share, exam-format items                          | High for sales      | L      | Medium | 70% teacher weekly active; 30 min/week saved                                                                               |
| **P2**   | Accessibility: fix contrast, screen-reader labels, keyboard/focus; human audit                                                 | Medium              | M      | Low    | WCAG 2.2 AA verified by audit, not just axe                                                                                |
| **P2**   | Offline security: encrypt IndexedDB or remove answer keys; wipe packs/outbox on logout                                         | High                | M      | Medium | Shared-device test: no prior student data after logout; no answer keys in DevTools                                         |
| **P2**   | Performance: DB-inclusive p95, load test, low-end Android budget                                                               | Medium              | M      | Medium | p95<300 ms at 200 RPS; crash-free >99.5%                                                                                   |
| **P3**   | Pricing, LOIs, support model, content-ops cost                                                                                 | High for viability  | M      | Medium | 5 signed LOIs; unit economics positive at pilot scale                                                                      |

**Essential vs optional:** P0 and P1 are essential before any real student data. P2 is required before claiming efficacy or scaling. P3 is required before spending on sales. Everything in the current "gamification/certificates/AI tutor expansion/multi-board/Terraform" bucket is optional and should be frozen until the core is proven.

---

## 30/60/90-day plan

### Days 0–7 — stop the bleeding

1. Freeze feature work. Declare a security/integrity incident review.
2. Remove `mock_token_`, demo token minting, and any default/demo credentials; rotate JWT and env secrets; audit logs for `mock_token_` use.
3. Add regression tests: `mock_token_*` → 401; teacher A → student B → 403; unconsented diagnostic → 403; logout → refresh rejected.
4. Disable the fabricated evaluation endpoint and the mock tutor in production; add explicit "demo/synthetic" labels where data is not real.
5. Verify tracked `.env.*` contents; purge history if needed.
6. Fix or remove the CSP; run a production-mode browser smoke test. Fix or delete the CD claims; fix the Docker context.
7. Write a one-page risk register and a claim-to-evidence table; remove every README claim that is not currently true.

### Days 8–30 — make it safe and testable

1. Add Postgres 16 CI with Testcontainers; run migrations up/down; test RLS with a non-owner role; resolve the RLS/join-code dilemma explicitly.
2. Centralize authorization; scope every teacher/student query by school/class; add pagination and response schemas.
3. Implement token revocation and cookie-based sessions; remove localStorage tokens; enforce CSRF.
4. Fix rate limiting and the sync transaction; add partial-failure/replay/concurrency tests.
5. Collapse to one BKT path; fix the ranker and diagnostic reproducibility; add model versioning.
6. Start SME review of the 200 items; remove generated items from the seed; document copyright status.
7. Add real OTel/metrics or remove the claim; run a backup/restore drill and record RPO/RTO.

### Days 31–60 — narrow pilot

1. Pick one wedge: Class 8 mathematics, 2–3 affordable private schools, one region.
2. Implement verified guardian consent (OTP to guardian phone, audit trail), school DPA, retention job, and full erasure semantics.
3. Onboard teachers with roster import, a simple assignment flow, and a class gap report; provide WhatsApp/print-friendly parent summaries.
4. Instrument pre-answer predictions, attempt outcomes, time-on-task, and teacher actions; run weekly data-quality reviews.
5. Load-test 40 students behind one NAT; test shared tablets, 2G/3G, low-end Android, and offline sync for 24 hours.
6. Get 5 LOIs and a willingness-to-pay signal before expanding scope.

### Days 61–90 — evidence or pivot

1. Run the pre/post efficacy analysis with a preregistered primary outcome; report effect size, CI, attrition, and subgroup results.
2. Commission an external pentest and an accessibility audit; fix critical/high findings.
3. Decide: expand to another grade/subject only if the efficacy and retention metrics clear the gates; otherwise narrow further or stop.
4. Publish an honest limitations page: what the engine does, what it does not, and what evidence exists.

---

## Validation plan and measurable success criteria

### Security

- `mock_token_*` rejected in all environments.
- Cross-tenant matrix returns 403.
- CSRF missing/mismatch returns 403.
- Refresh reuse rejected; logout revokes.
- Rate limits hold under spoofed `X-Forwarded-For`.
- RLS suite passes with a non-owner role.
- Full-history secret scan clean.
- External pentest has zero critical/high findings.

### Database

- Migrations up/down on Postgres 16 in CI.
- Partition insert/query works.
- Unique idempotency semantics verified.
- Restore drill with checksum, row counts, RPO/RTO recorded.

### Engine

- Pre-answer predictions only: AUC ≥0.70 (proposed) on a student-level holdout, ECE ≤0.05, Brier score reported with 95% CI.
- Calibration slope/intercept.
- Item p-values 0.2–0.8, discrimination >0.2, distractor analysis.
- DIF by language.
- Same seed → same diagnostic.
- Same answer → same mastery on every endpoint.

### Learning efficacy

- 3–5 schools, n≥300, 8 weeks, pre/post standardized NCERT-aligned unit test, delayed post-test at 4 weeks.
- Preregistered primary outcome.
- Attrition <20%.
- Effect size ≥0.3 with 95% CI excluding zero.
- Secondary: teacher time saved ≥30 min/week, assignment completion ≥70%, student retention.

### Operations

- p95 <300 ms at 200 RPS / 1,000 concurrent.
- Error rate <0.5%.
- 99.5% monthly availability measured from real traffic.
- 24-hour offline sync success >99%.
- Crash-free sessions >99.5%.
- CSP zero violations in production browser matrix.

### Product and commercial

- 5 signed LOIs.
- 3 schools live.
- 70% teacher weekly active.
- 60% student weekly completion.
- Validated willingness to pay with 10 principals.
- Content-ops cost per reviewed item known.

---

## Facts, judgments, and unknowns

### Verified code facts

- `mock_token_` backdoor and demo token minting.
- Cross-tenant consent/attempt/mastery access at the application layer.
- `student_join` lacks lockout/failure counting; 4-digit PIN; username enumeration.
- 24-hour access tokens; no revocation; localStorage tokens.
- Label leakage in `/admin/evaluation`; synthetic fallback.
- Mock tutor default; unused output/answer-leak guards; client-controlled test mode.
- Two BKT implementations and duplicate `/v1` mount; ranker discards prerequisite edges; fixed 20-question diagnostic; no calibration wiring.
- 150 skills / 200 questions; 404 KB generated question data; migration demotes them.
- CI has no Postgres; tests default to SQLite; RLS tests mock; benchmark is CPU-only.
- CD deploys nothing; Docker context mismatch; `uv.lock` exists but is untracked.
- CSP nonce not propagated; `style-src 'unsafe-inline'`.
- Offline Dexie is plaintext; `clearAuthSession` does not clear IndexedDB/outbox.
- Tracked `.env.production`, `.env.staging`, `.env.development`.
- 40+ uncommitted modified files.

### Judgments

- The product is over-scoped for its stage; the README describes intent, not status.
- The AI tutor and gamification are not moats; verified content, teacher workflow, distribution, and evidence are.
- The current evaluation dashboard is misleading and should not be shown to a buyer.
- The primary CTA contrast fails WCAG AA.
- A school pilot with real minors' data should not start until P0/P1 are closed.

### Unknowns / not verified

- Whether tracked `.env.*` files contain live secrets (I did not open them).
- The deployed DB role and whether RLS is active or bypassed.
- Whether the actual deployment uses Supabase, Neon, or both; the README and code disagree.
- Whether backups ran and whether a restore drill succeeded.
- Whether any school pilot, LOI, or efficacy data exists outside the repo.
- Whether the CSP breaks the production build in practice (one browser test settles it).
- Whether Playwright E2E runs against a real API or mocks; whether Firefox/WebKit projects exist.
- Whether the offline downloader populates `correctAnswer` on device.
- Copyright/licensing status of NCERT-derived content.
- Whether `retention_service` is scheduled and enforced.

### Not done

I did not run tests, builds, migrations, load tests, or dynamic security scans; I did not inspect a deployed environment; I did not read env files. Passing checks were not observed, so none are claimed.

---

## Bottom line

If this is a portfolio or demo project, it is strong: broad, typed, tested in places, and thoughtfully documented. If it is a product intended for real schools and minors, it is **not ready**, and the most urgent work is not more features.

The biggest threats are, in order:

1. **A trivially exploitable authentication backdoor** and weak session lifecycle.
2. **Cross-tenant access to minors' data**, with RLS that is either broken or decorative.
3. **Misleading evidence** (label leakage, mock tutor, generated content, theatrical CD) that will not survive due diligence.
4. **An adaptive engine that is inconsistent and uncalibrated**, so the core promise is unproven.
5. **A production path that is likely to break** on CSP, deployment, rate limits, and sync transactions.

The realistic path is to freeze scope, fix P0, make the Postgres/RLS/authz path testable, collapse the engine to one honest implementation, review the content, and run a narrow Class 8 maths pilot with verified consent and real efficacy measurement. If that pilot cannot show a learning gain and teacher time savings, more engineering will not save the idea.
