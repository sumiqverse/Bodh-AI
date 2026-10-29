# Zero-Downtime, Backward-Compatible Database Migration Strategy

## Overview

BodhAI serves continuous classroom learning sessions across Indian schools. Database schema migrations must never interrupt active student sessions, cause connection locks, or cause downtime.

This document defines our **Expand-Contract (Parallel Run)** database migration protocol and step-by-step rollback procedures.

---

## The Expand-Contract Migration Pattern

Schema changes must be split across releases to maintain backward compatibility between the running application code and the database schema.

```
+-----------------------------------------------------------------------------------+
| Release N-1         | Release N (Expand)     | Release N+1            | Release N+2 (Contract)|
| (Current Baseline)  | (Additive Schema)      | (Switch & Dual Write)  | (Prune Legacy)        |
+---------------------+------------------------+------------------------+-----------------------+
| App reads/writes    | 1. DB adds nullable    | 1. App reads/writes    | 1. App drops old code |
| Column A            |    Column B            |    Column B            |    references         |
|                     | 2. App code still      | 2. Background worker   | 2. DB drops           |
|                     |    reads Column A      |    backfills A -> B    |    Column A           |
+-----------------------------------------------------------------------------------+
```

### Phase 1: Expand (Additive & Non-breaking)

- All new columns **MUST** be `NULLABLE` or have a database-level `DEFAULT` clause that does not trigger a full table rewrite.
- New indices must be created using `CREATE INDEX CONCURRENTLY` to avoid taking an exclusive table lock on high-volume tables (`attempts`, `interaction_logs`).
- New foreign keys must be added with `NOT VALID` followed by `VALIDATE CONSTRAINT` in a separate transaction.

### Phase 2: Dual Write & Read Transition

- Deploy application code that writes to both the old and new columns/tables.
- Reads transition to the new schema with automatic fallback to old schema if null.

### Phase 3: Background Asynchronous Backfill

- Execute batch-wise asynchronous backfill scripts (e.g. 500 rows/batch with a 100ms pause) during off-peak hours (10 PM – 5 AM IST).
- Never execute monolithic `UPDATE table SET new_col = old_col` across millions of student attempts in a single transaction.

### Phase 4: Contract (Cleanup)

- Once metrics confirm 100% of rows are migrated and zero queries touch the deprecated column:
- Remove legacy column/table via an Alembic migration in the subsequent sprint.

---

## Safe PostgreSQL Migration Rules

To protect against connection saturation and query starvation:

1. **Short Lock Timeouts**:
   Every migration script must enforce a conservative lock timeout:

   ```sql
   SET lock_timeout = '3s';
   ```

   If an exclusive lock cannot be acquired within 3 seconds, the migration aborts immediately, protecting active student traffic.

2. **Index Creation**:

   ```sql
   -- NEVER:
   -- CREATE INDEX idx_attempts_student_id ON attempts (student_id);

   -- ALWAYS:
   COMMIT; -- Exit transaction block for concurrent execution
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attempts_student_id ON attempts (student_id);
   ```

3. **Column Renaming**:
   **NEVER** rename an existing column directly in production. Use Phase 1 Expand (add new column) -> Phase 2 Dual Write -> Phase 4 Contract.

4. **Enum Modification**:
   Use `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'new_value'` which does not require table rewriting.

---

## Rollback Procedures

Every schema migration committed to `apps/api/alembic/versions/` **MUST** have a tested `downgrade()` function matching its `upgrade()`.

### Step 1: Detect Migration Issue

If an error spike or latency degradation occurs during/immediately after migration:

- Sentry alerts trigger on error rate > 1%.
- The on-call engineer references the incident runbook (`docs/runbooks/INCIDENT_RESPONSE.md`).

### Step 2: Code Rollback

Roll back application containers first if the error is triggered by code exceptions:

```bash
# Cloud Run / Container deployment rollback
gcloud run services rollback bodhai-api --region asia-south1
```

### Step 3: Schema Downgrade (If Required)

Because migrations follow the Expand phase, previous application revisions remain compatible with the expanded schema. A schema downgrade is usually **not** required immediately.

If a schema downgrade is strictly necessary:

```bash
# Verify current migration head
uv run alembic current

# Downgrade single revision
uv run alembic downgrade -1

# Verify schema health
uv run python scripts/verify_schema_integrity.py
```

### Step 4: Verification

Run synthetic smoke tests against the API health check:

```bash
curl -f https://api.bodhai.org/health
```
