import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearOfflineDatabase,
  enqueueOutboxAttempt,
  getOfflineDB,
  getPendingOutboxCount,
} from '@/lib/offline/db';
import { syncManager, type SyncStatus } from '@/lib/offline/sync';

describe('BodhAI Offline SyncManager', () => {
  beforeEach(async () => {
    const db = getOfflineDB();
    await clearOfflineDatabase(db);
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    const db = getOfflineDB();
    await clearOfflineDatabase(db);
  });

  it('provides synchronous initial status and notifies subscribers', async () => {
    const statuses: SyncStatus[] = [];
    const unsubscribe = syncManager.subscribe((status) => {
      statuses.push(status);
    });

    expect(statuses.length).toBeGreaterThanOrEqual(1);
    expect(statuses[0]?.isOnline).toBeDefined();

    unsubscribe();
  });

  it('triggers sync when online, batches outbox events, and reconciles canonical mastery', async () => {
    const db = getOfflineDB();
    const ev1 = await enqueueOutboxAttempt(
      {
        question_id: 'q-1',
        skill_id: 'sk-1',
        selected_answer: 'B',
      },
      'attempt_submission',
      db,
    );

    const ev2 = await enqueueOutboxAttempt(
      {
        question_id: 'q-2',
        skill_id: 'sk-1',
        selected_answer: 'A',
      },
      'attempt_submission',
      db,
    );

    expect(await getPendingOutboxCount(db)).toBe(2);

    // Mock fetch for /api/v1/sync
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        batch_id: 'batch-test-001',
        processed_count: 2,
        failed_count: 0,
        results: [
          {
            client_event_id: ev1.id,
            status: 'replayed',
            server_event_id: 'srv-1',
          },
          {
            client_event_id: ev2.id,
            status: 'replayed',
            server_event_id: 'srv-2',
          },
        ],
        canonical_mastery: [
          {
            skill_id: 'sk-1',
            p_mastery: 0.88,
            state: 'mastered',
            attempts_count: 2,
            correct_count: 2,
          },
        ],
      }),
    });
    globalThis.fetch = mockFetch;

    syncManager.setStudentId('student-sync-test');
    await syncManager.triggerSync();

    // Assert fetch was called with batch
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toContain('/api/v1/sync');
    expect(requestInit.method).toBe('POST');

    const parsedBody = JSON.parse(requestInit.body as string) as {
      events: Array<{ client_event_id: string }>;
    };
    expect(parsedBody.events).toHaveLength(2);
    expect(parsedBody.events[0]?.client_event_id).toBe(ev1.id);
    expect(parsedBody.events[1]?.client_event_id).toBe(ev2.id);

    // Assert outbox events were resolved and removed
    expect(await getPendingOutboxCount(db)).toBe(0);

    // Assert canonical mastery was applied
    const mastery = await db.offlineMastery.get(['sk-1', 'student-sync-test']);
    expect(mastery?.pMastery).toBe(0.88);
    expect(mastery?.state).toBe('mastered');
  });

  it('preserves outbox items and schedules retry on server error', async () => {
    const db = getOfflineDB();
    await enqueueOutboxAttempt({ test: 'fail' }, 'attempt_submission', db);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });
    globalThis.fetch = mockFetch;

    await syncManager.triggerSync();

    // Outbox item must NOT be dropped on server error
    const remainingCount = await getPendingOutboxCount(db);
    expect(remainingCount).toBe(1);

    const status = await syncManager.getStatus();
    expect(status.error).toContain('503');
  });
});
