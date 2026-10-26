# Offline-First Synchronization & Conflict Resolution Architecture

BodhAI operates on an **offline-first** paradigm, enabling students in Classes 6–10 in rural, low-bandwidth, and intermittent-connectivity environments to learn and solve problems uninterrupted.

---

## 1. Core Principles

1. **Local-First Progress**:
   - Students can solve questions, receive immediate local scaffolded feedback, and update on-device mastery using `@bodhai/engine-ts`.
   - All attempts are written to an append-only outbox in IndexedDB (`BodhAIDatabase.outbox`) with client-generated UUIDv4 identifiers.
2. **Authoritative Server Truth**:
   - The server is the single authoritative source of truth for student competence, diagnostic states, and historical analytics.
   - When connectivity resumes, the client syncs pending events to `POST /api/v1/sync`. The server replays the attempts and returns the canonical recomputed mastery state.

---

## 2. Conflict Resolution Rules

### Rule 1: Idempotent Deduplication (Duplicates Ignored)

- Every queued offline event contains a unique `client_event_id` (UUIDv4) generated at the moment of completion (`crypto.randomUUID()`).
- The server checks the `sync_events` table for existing records with the same `client_event_id`.
- If an event has already been processed, it is marked as `status: "duplicate"` in the response. No second attempt record or duplicate Bayesian update is created.

### Rule 2: Deterministic Chronological Sorting (Out-of-Order Replay)

- Due to network packet re-ordering, retried batches, or client-side batching, events may arrive out-of-order.
- The server sorts all items in `batch.events` deterministically by `client_timestamp` ascending prior to replaying.
- This ensures the sequential Bayesian Knowledge Tracing (BKT) updates reflect the student's actual chronological learning progression.

### Rule 3: Clock-Skew Validation & Sanitization

- Local device clocks can drift, be altered maliciously, or be configured incorrectly.
- The server validates `client_timestamp` against the server's current UTC time (`now = datetime.now(UTC)`):
  - **Future Timestamp (Clock Ahead)**: If `client_timestamp > now + 5 minutes`, the server logs a warning and clamps the effective audit timestamp to `now`. A flag `client_clock_skew_flag: true` is attached to the payload.
  - **Excessively Stale Timestamp (Clock Behind)**: If `now - client_timestamp > 90 days`, the event is evaluated against DPDP storage limitation policies.
- Attempt calculations rely on the verified sequence order, ensuring statistical integrity regardless of device clock anomalies.

### Rule 4: Canonical State Reconciliation

- On completion of batch processing, the server re-queries all updated `Mastery` records for the student.
- The server returns `canonical_mastery: list[MasteryResponse]` in `SyncBatchResponse`.
- The client replaces its local offline mastery cache with the canonical server state.

### Rule 5: Exponential Backoff & Network Recovery

- When offline or during server errors (HTTP 5xx, timeouts), the client pauses synchronization and schedules retries with exponential backoff and jitter:
  $$\text{Delay} = \min(30\text{s}, 1.5^{\text{retryCount}} \times 1\text{s}) + \text{jitter}$$
- When a `window.addEventListener('online')` event or Service Worker `sync` event fires, immediate synchronization is triggered.

### Rule 6: Shared Device Data Wipe & Logout Hygiene

- In shared classroom or community center hardware (tablets/laptops shared among multiple students):
  - If a student initiates Logout while `pendingSyncCount > 0`, a warning modal displays: _"You have unsynced attempts on this device."_
  - The student can choose **Sync & Logout** (pushes outbox, waits for confirmation, then wipes IndexedDB) or **Wipe & Logout** (discards local cache to prevent data leakage to the next student).
  - All lesson packs, attempts outbox, and cached mastery are cleared from IndexedDB upon confirmed logout.
