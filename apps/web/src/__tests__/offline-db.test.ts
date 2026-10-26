import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BodhAIDatabase,
  clearOfflineDatabase,
  enqueueOutboxAttempt,
  getLessonPack,
  getOfflineDB,
  getPendingOutboxCount,
  getPendingOutboxEvents,
  getStorageQuota,
  isQuotaAvailable,
  markOutboxFailed,
  markOutboxSyncing,
  resolveOutboxEvents,
  saveLessonPack,
  saveOfflineMastery,
  applyCanonicalMastery,
  type OfflineLessonPack,
} from '@/lib/offline/db';

describe('BodhAI IndexedDB Offline DB', () => {
  let db: BodhAIDatabase;

  beforeEach(async () => {
    db = getOfflineDB();
    await clearOfflineDatabase(db);
  });

  afterEach(async () => {
    await clearOfflineDatabase(db);
  });

  it('enqueues an attempt event with client-generated UUID and pending status', async () => {
    const payload = {
      question_id: 'q-101',
      skill_id: 'sk-math-integers',
      selected_answer: 'B',
      time_spent_ms: 3200,
    };

    const event = await enqueueOutboxAttempt(payload, 'attempt_submission', db);

    expect(event.id).toBeDefined();
    expect(event.clientEventId).toBe(event.id);
    expect(event.status).toBe('pending');
    expect(event.retryCount).toBe(0);
    expect(event.payload).toEqual(payload);

    const pending = await getPendingOutboxEvents(db);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(event.id);
  });

  it('orders pending outbox events chronologically by timestamp', async () => {
    const ev1 = await enqueueOutboxAttempt({ attempt: 1 }, 'attempt_submission', db);
    // Artificially space timestamps
    await new Promise((r) => setTimeout(r, 10));
    const ev2 = await enqueueOutboxAttempt({ attempt: 2 }, 'attempt_submission', db);

    const pending = await getPendingOutboxEvents(db);
    expect(pending).toHaveLength(2);
    expect(pending[0]?.id).toBe(ev1.id);
    expect(pending[1]?.id).toBe(ev2.id);
  });

  it('marks outbox items as syncing and resolves them by bulk deletion upon sync', async () => {
    const ev1 = await enqueueOutboxAttempt({ item: 'first' }, 'attempt_submission', db);
    const ev2 = await enqueueOutboxAttempt({ item: 'second' }, 'attempt_submission', db);

    expect(await getPendingOutboxCount(db)).toBe(2);

    await markOutboxSyncing([ev1.id, ev2.id], db);
    const inFlight = await db.outbox.get(ev1.id);
    expect(inFlight?.status).toBe('syncing');

    await resolveOutboxEvents([ev1.id], db);
    expect(await db.outbox.get(ev1.id)).toBeUndefined();
    expect(await db.outbox.get(ev2.id)).toBeDefined();
  });

  it('marks outbox item as failed with error and increments retryCount', async () => {
    const ev = await enqueueOutboxAttempt({ item: 'fail-test' }, 'attempt_submission', db);

    await markOutboxFailed(ev.id, 'HTTP 503 Service Unavailable', db);

    const updated = await db.outbox.get(ev.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toBe('HTTP 503 Service Unavailable');
  });

  it('stores, retrieves, and deletes chapter lesson packs', async () => {
    const samplePack: OfflineLessonPack = {
      id: 'ch-math-integers',
      chapterId: 'ch-math-integers',
      curriculumId: 'ncert-math-class6',
      grade: 6,
      subject: 'Mathematics',
      title: 'Integers & Operations',
      version: 1,
      sizeBytes: 1024 * 1024,
      downloadedAt: new Date().toISOString(),
      data: {
        chapterId: 'ch-math-integers',
        title: 'Integers & Operations',
        skills: [
          {
            id: 'sk-001',
            code: 'MATH-6-INT-01',
            name: 'Adding positive and negative integers',
            description: 'Core arithmetic on number lines',
            difficulty: 2,
            sequenceOrder: 1,
          },
        ],
        questions: [
          {
            id: 'q-001',
            skillId: 'sk-001',
            code: 'MATH-6-INT-01-Q1',
            difficulty: 2,
            questionType: 'multiple_choice',
            prompt: 'Calculate: $-5 + 8$',
            options: [
              { id: 'A', text: '-3' },
              { id: 'B', text: '3' },
            ],
            correctAnswer: 'B',
          },
        ],
      },
    };

    await saveLessonPack(samplePack, db);

    const retrieved = await getLessonPack('ch-math-integers', db);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Integers & Operations');
    expect(retrieved?.data.skills).toHaveLength(1);
  });

  it('saves offline mastery and reconciles with server canonical mastery', async () => {
    await saveOfflineMastery(
      {
        skillId: 'sk-001',
        studentId: 'student-42',
        pMastery: 0.72,
        state: 'partial',
        observationsCount: 2,
        hintFreeCorrectCount: 1,
        updatedAt: new Date().toISOString(),
      },
      db,
    );

    const localRecord = await db.offlineMastery.get(['sk-001', 'student-42']);
    expect(localRecord?.pMastery).toBe(0.72);

    // Apply canonical server mastery
    await applyCanonicalMastery(
      [
        {
          skill_id: 'sk-001',
          p_mastery: 0.96,
          state: 'mastered',
          attempts_count: 5,
          correct_count: 4,
        },
      ],
      'student-42',
      db,
    );

    const updated = await db.offlineMastery.get(['sk-001', 'student-42']);
    expect(updated?.pMastery).toBe(0.96);
    expect(updated?.state).toBe('mastered');
  });

  it('checks storage quota and validates space availability', async () => {
    const quota = await getStorageQuota();
    expect(quota.totalBytes).toBeGreaterThan(0);
    expect(quota.availableBytes).toBeGreaterThan(0);

    const canFit1MB = await isQuotaAvailable(1024 * 1024);
    expect(canFit1MB).toBe(true);
  });

  it('purges all tables on clearOfflineDatabase (shared device logout)', async () => {
    await enqueueOutboxAttempt({ test: true }, 'attempt_submission', db);
    await saveOfflineMastery(
      {
        skillId: 'sk-999',
        studentId: 'student-temp',
        pMastery: 0.5,
        state: 'partial',
        observationsCount: 1,
        hintFreeCorrectCount: 0,
        updatedAt: new Date().toISOString(),
      },
      db,
    );

    expect(await getPendingOutboxCount(db)).toBe(1);

    await clearOfflineDatabase(db);

    expect(await getPendingOutboxCount(db)).toBe(0);
    expect(await db.offlineMastery.count()).toBe(0);
    expect(await db.lessonPacks.count()).toBe(0);
  });
});
