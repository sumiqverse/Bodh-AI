/**
 * BodhAI IndexedDB Offline Storage via Dexie.
 * Manages versioned chapter lesson packs, an append-only outbox of attempt events,
 * offline mastery states, and device storage quota estimation.
 */

import Dexie, { type EntityTable, type Table } from 'dexie';

export interface OfflineLessonPack {
  readonly id: string; // chapterId
  readonly chapterId: string;
  readonly curriculumId: string;
  readonly grade: number;
  readonly subject: string;
  readonly title: string;
  readonly version: number;
  readonly sizeBytes: number;
  readonly downloadedAt: string;
  readonly data: {
    readonly chapterId: string;
    readonly title: string;
    readonly skills: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly name: string;
      readonly description: string;
      readonly difficulty: number;
      readonly sequenceOrder: number;
    }>;
    readonly questions: ReadonlyArray<{
      readonly id: string;
      readonly skillId: string;
      readonly code: string;
      readonly difficulty: number;
      readonly questionType: string;
      readonly prompt: string;
      readonly options?: ReadonlyArray<{ readonly id: string; readonly text: string }>;
      readonly correctAnswer?: string;
      readonly explanation?: string;
      readonly hints?: readonly string[];
    }>;
  };
}

export interface OfflineOutboxEvent {
  readonly id: string; // client UUID (UUIDv4)
  readonly clientEventId: string; // identical to id for deduplication
  readonly eventType: string; // 'attempt_submission'
  readonly payload: Record<string, unknown>;
  readonly timestamp: string; // ISO string
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface OfflineMasteryRecord {
  readonly skillId: string;
  readonly studentId: string;
  readonly pMastery: number;
  readonly state: 'not_learned' | 'partial' | 'mastered';
  readonly observationsCount: number;
  readonly hintFreeCorrectCount: number;
  readonly updatedAt: string;
}

export interface StorageQuotaInfo {
  readonly usedBytes: number;
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly percentUsed: number;
  readonly isQuotaExceeded: boolean;
}

export class BodhAIDatabase extends Dexie {
  public lessonPacks!: EntityTable<OfflineLessonPack, 'id'>;
  public outbox!: EntityTable<OfflineOutboxEvent, 'id'>;
  public offlineMastery!: Table<OfflineMasteryRecord, [string, string]>;

  constructor(dbName = 'BodhAIOfflineDB') {
    super(dbName);
    this.version(1).stores({
      lessonPacks: 'id, chapterId, subject, grade, version',
      outbox: 'id, clientEventId, status, timestamp',
      offlineMastery: '[skillId+studentId], skillId, studentId, state, updatedAt',
    });
  }
}

// Singleton database instance for application runtime
let _dbInstance: BodhAIDatabase | null = null;

export function getOfflineDB(): BodhAIDatabase {
  if (!_dbInstance) {
    _dbInstance = new BodhAIDatabase();
  }
  return _dbInstance;
}

/**
 * Estimates storage usage and remaining quota using the browser Storage API.
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage ?? 0;
      const total = estimate.quota ?? 100 * 1024 * 1024;
      const available = Math.max(0, total - used);
      const percent = total > 0 ? (used / total) * 100 : 0;
      return {
        usedBytes: used,
        totalBytes: total,
        availableBytes: available,
        percentUsed: Math.round(percent * 10) / 10,
        isQuotaExceeded: available < 2 * 1024 * 1024, // under 2MB available
      };
    } catch {
      // Fallback below
    }
  }

  return {
    usedBytes: 5 * 1024 * 1024,
    totalBytes: 500 * 1024 * 1024,
    availableBytes: 495 * 1024 * 1024,
    percentUsed: 1.0,
    isQuotaExceeded: false,
  };
}

/**
 * Checks if sufficient quota is available for a download package.
 */
export async function isQuotaAvailable(requiredBytes: number): Promise<boolean> {
  const quota = await getStorageQuota();
  return quota.availableBytes >= requiredBytes && !quota.isQuotaExceeded;
}

/**
 * Stores a downloaded lesson pack into IndexedDB with version metadata.
 */
export async function saveLessonPack(
  pack: OfflineLessonPack,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  await db.lessonPacks.put(pack);
}

/**
 * Retrieves a lesson pack by chapter ID.
 */
export async function getLessonPack(
  chapterId: string,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<OfflineLessonPack | undefined> {
  return db.lessonPacks.get(chapterId);
}

/**
 * Lists all downloaded lesson packs.
 */
export async function getAllLessonPacks(
  db: BodhAIDatabase = getOfflineDB(),
): Promise<OfflineLessonPack[]> {
  return db.lessonPacks.toArray();
}

/**
 * Deletes a downloaded lesson pack to reclaim device storage.
 */
export async function deleteLessonPack(
  chapterId: string,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  await db.lessonPacks.delete(chapterId);
}

/**
 * Appends an attempt event to the outbox with a client-generated UUIDv4.
 */
export async function enqueueOutboxAttempt(
  payload: Record<string, unknown>,
  eventType = 'attempt_submission',
  db: BodhAIDatabase = getOfflineDB(),
): Promise<OfflineOutboxEvent> {
  const eventId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const event: OfflineOutboxEvent = {
    id: eventId,
    clientEventId: eventId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  await db.outbox.add(event);
  return event;
}

/**
 * Retrieves all pending outbox events sorted chronologically by timestamp.
 */
export async function getPendingOutboxEvents(
  db: BodhAIDatabase = getOfflineDB(),
): Promise<OfflineOutboxEvent[]> {
  const events = await db.outbox
    .where('status')
    .equals('pending')
    .or('status')
    .equals('failed')
    .toArray();

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Marks outbox events as syncing.
 */
export async function markOutboxSyncing(
  ids: readonly string[],
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  await db.transaction('rw', db.outbox, async () => {
    for (const id of ids) {
      await db.outbox.update(id, { status: 'syncing' });
    }
  });
}

/**
 * Resolves successfully synced outbox events by removing them.
 */
export async function resolveOutboxEvents(
  syncedIds: readonly string[],
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  await db.outbox.bulkDelete([...syncedIds]);
}

/**
 * Marks an outbox event as failed with error details and increments retry count.
 */
export async function markOutboxFailed(
  id: string,
  errorMsg: string,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  const existing = await db.outbox.get(id);
  if (existing) {
    await db.outbox.update(id, {
      status: 'failed',
      retryCount: existing.retryCount + 1,
      lastError: errorMsg,
    });
  }
}

/**
 * Counts total pending outbox events awaiting sync.
 */
export async function getPendingOutboxCount(db: BodhAIDatabase = getOfflineDB()): Promise<number> {
  return db.outbox.where('status').equals('pending').or('status').equals('failed').count();
}

/**
 * Updates or caches student offline mastery state in IndexedDB.
 */
export async function saveOfflineMastery(
  record: OfflineMasteryRecord,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  await db.offlineMastery.put(record);
}

/**
 * Replaces offline mastery with canonical state returned from the server.
 */
export async function applyCanonicalMastery(
  canonical: ReadonlyArray<{
    readonly skill_id: string;
    readonly p_mastery: number;
    readonly state: 'not_learned' | 'partial' | 'mastered';
    readonly attempts_count: number;
    readonly correct_count: number;
  }>,
  studentId: string,
  db: BodhAIDatabase = getOfflineDB(),
): Promise<void> {
  const records: OfflineMasteryRecord[] = canonical.map((m) => ({
    skillId: m.skill_id,
    studentId,
    pMastery: m.p_mastery,
    state: m.state,
    observationsCount: m.attempts_count,
    hintFreeCorrectCount: m.correct_count,
    updatedAt: new Date().toISOString(),
  }));

  await db.transaction('rw', db.offlineMastery, async () => {
    for (const r of records) {
      await db.offlineMastery.put(r);
    }
  });
}

/**
 * Purges all IndexedDB data on shared device logout.
 */
export async function clearOfflineDatabase(db: BodhAIDatabase = getOfflineDB()): Promise<void> {
  await db.transaction('rw', db.lessonPacks, db.outbox, db.offlineMastery, async () => {
    await db.lessonPacks.clear();
    await db.outbox.clear();
    await db.offlineMastery.clear();
  });
}
