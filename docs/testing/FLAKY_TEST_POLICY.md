# BodhAI Flaky Test Quarantine & Elimination Policy

**Document:** `docs/testing/FLAKY_TEST_POLICY.md`  
**Applies To:** All test suites across `apps/api` (pytest), `apps/web` (Vitest & Playwright E2E), and shared packages  
**Enforcement Level:** Mandatory CI Quality Gate  
**Owner:** Engineering Quality & Platform Security

---

## 1. Objective & Philosophy

Flaky tests erode developer trust, obscure real regressions, delay security patches, and consume engineering cycles. BodhAI maintains a **zero-flakiness tolerance policy**:

1. **A test must pass 100% of the time on valid code.**
2. **If a test produces non-deterministic results, it is quarantined immediately** to unblock mainline CI pipelines while an engineer investigates under a strict SLA.
3. **Quarantine is temporary isolation, not permanent suppression.** Every quarantined test has an assigned owner, tracking issue, and 5-day expiration timer.

---

## 2. Definition & Classification of Flaky Tests

A test is classified as **Flaky** if:

- It fails $\ge 2$ times across 10 runs on an identical, unmodified Git commit.
- It fails intermittently in CI on a branch where local execution passed.
- Its pass/fail status depends on test execution order (`pytest-randomly` or file order).
- Its failure is tied to real clock time, timezones, or leap days.

### Common Root Causes & Anti-Patterns:

| Root Cause              | Anti-Pattern                                                   | Required Engineering Fix                                                                                     |
| :---------------------- | :------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Arbitrary Timing**    | `time.sleep(2)` or `await sleep(1000)`                         | Replace with event-driven polling (`wait_for_condition`, Playwright `await expect(locator).toBeVisible()`).  |
| **Shared DB State**     | Tests modifying database rows without cleanup                  | Enforce isolated SQLite/Postgres transactions rolled back after each test (`async with session.rollback()`). |
| **External Network**    | Calling external HTTP endpoints or real LLM APIs               | Enforce local mocks (`AsyncMock`, `MockLLMProvider`, `httpx_mock`).                                          |
| **Unseeded Randomness** | Unseeded `random.choice()` or `faker`                          | Seed random generators (`faker.seed_instance(42)`, Hypothesis deterministic seeds).                          |
| **Concurrency Races**   | Concurrent Redis rate limit increments without synchronization | Use atomic Redis pipelines or mock synchronization barriers.                                                 |

---

## 3. Quarantine Mechanisms

### 3.1 Backend (Pytest)

Quarantined Python tests are marked with `@pytest.mark.quarantine`:

```python
import pytest

@pytest.mark.quarantine(reason="Issue #412: Transient async session teardown error on Windows runners")
@pytest.mark.asyncio
async def test_student_concurrent_attempts(client: AsyncClient) -> None:
    ...
```

#### CI Execution Separation:

In `apps/api/pyproject.toml`, main test runs exclude quarantined tests:

```toml
[tool.pytest.ini_options]
addopts = "-m 'not quarantine'"
markers = [
    "quarantine: marks tests quarantined due to non-deterministic flakiness (run in isolated job)",
]
```

A dedicated, non-blocking CI job (`test-quarantine`) runs quarantined tests repeatedly to gather diagnostic telemetry:

```bash
uv run pytest -m quarantine --count=10 -v
```

---

### 3.2 Frontend Unit Tests (Vitest)

In `apps/web/src/**/*.test.ts`:

```typescript
import { test, describe } from 'vitest';

describe.skipIf(process.env.CI_SKIP_QUARANTINE === 'true')('QUARANTINE(Issue #413): audio waveform rendering', () => {
  test('renders offline audio element', () => {
    ...
  });
});
```

---

### 3.3 End-to-End Tests (Playwright)

In `apps/web/e2e/*.spec.ts`:

```typescript
import { test } from '@playwright/test';

// Quarantined tests are tagged with @quarantine and skipped in main PR gate
test.describe('Adaptive Journey', () => {
  test('recovers from sudden offline mid-session @quarantine', async ({ page }) => {
    test.fixme(true, 'Issue #414: Network throttling disconnect event race condition in WebKit');
    ...
  });
});
```

---

## 4. Lifecycle Protocol & SLA

```
[Detection in CI / Local]
          │
          ▼ (< 2 Hours)
[Quarantine PR + GitHub Issue Created]
          │
          ▼ (< 5 Business Days SLA)
[Root Cause Investigation & Fix]
          │
          ▼ (Verification: 50/50 clean runs)
[Re-enable Test in Main Pipeline & Close Issue]
```

### Stage 1: Immediate Quarantine (< 2 Hours)

- Any engineer observing a non-deterministic failure in CI can submit an immediate quarantine PR without requiring full feature review.
- The PR must add the quarantine marker and link to an issue titled: `[FLAKY] <test_file.py>::<test_function>`.

### Stage 2: Issue Creation & Attribution

The tracking issue must document:

1. Exact test path and test name.
2. Link to failing CI workflow run and failure log/traceback.
3. Suspected root cause category (Timing, DB Leak, Resource Lock, Async Race).
4. Assigned engineer (author of the test or current rotation champion).

### Stage 3: Resolution SLA (5 Business Days)

- **Day 1–3:** Reproduce locally using `pytest-repeat` or loop runner:
  ```bash
  uv run pytest tests/test_suspect.py --count=50 -v
  ```
- **Day 4:** Implement deterministic fix (mocking, explicit wait, state isolation).
- **Day 5:** If the test cannot be stabilized or tests redundant functionality, the test must be retired with architectural approval. **A test may not remain in quarantine for > 5 business days.**

### Stage 4: De-Quarantine Gate (50 Consecutive Passes)

Before removing the quarantine marker:

- Run the test 50 times consecutively with randomized seed and zero failures:
  ```bash
  # Python
  uv run pytest tests/test_suspect.py --count=50 -x
  # Playwright E2E
  pnpm --filter web test:e2e --repeat-each=10
  ```
- Submit PR removing `@pytest.mark.quarantine`. CI merges green.
