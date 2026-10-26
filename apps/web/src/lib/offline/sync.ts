/**
 * BodhAI Offline Synchronization Manager.
 * Orchestrates background sync, online event triggering, batched outbox submission,
 * exponential backoff retry scheduling, and canonical server mastery reconciliation.
 */

import {
  applyCanonicalMastery,
  getPendingOutboxCount,
  getPendingOutboxEvents,
  markOutboxFailed,
  markOutboxSyncing,
  type OfflineOutboxEvent,
  resolveOutboxEvents,
} from './db';

export interface SyncStatus {
  readonly isOnline: boolean;
  readonly isSyncing: boolean;
  readonly pendingCount: number;
  readonly lastSyncedAt: string | null;
  readonly error: string | null;
}

export type SyncStatusListener = (status: SyncStatus) => void;

class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private syncError: string | null = null;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private studentId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        void this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }
        this.notify();
      });
    }
  }

  public setStudentId(id: string | null): void {
    this.studentId = id;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatusSync());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getStatus(): Promise<SyncStatus> {
    const pendingCount = await getPendingOutboxCount();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      error: this.syncError,
    };
  }

  public getStatusSync(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: 0,
      lastSyncedAt: this.lastSyncedAt,
      error: this.syncError,
    };
  }

  public notifyListeners(): void {
    this.notify();
  }

  private notify(): void {
    void this.getStatus().then((status) => {
      for (const listener of this.listeners) {
        listener(status);
      }
    });
  }

  /**
   * Main sync routine: extracts pending outbox events and pushes to /api/v1/sync.
   */
  public async triggerSync(): Promise<{
    processed: number;
    failed: number;
  }> {
    if (!this.isOnline || this.isSyncing) {
      const count = await getPendingOutboxCount();
      return { processed: 0, failed: count };
    }

    const pendingEvents = await getPendingOutboxEvents();
    if (pendingEvents.length === 0) {
      this.retryCount = 0;
      this.syncError = null;
      this.notify();
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notify();

    const ids = pendingEvents.map((e) => e.id);
    await markOutboxSyncing(ids);

    try {
      const payload = {
        events: pendingEvents.map((e: OfflineOutboxEvent) => ({
          client_event_id: e.clientEventId,
          event_type: e.eventType,
          payload: e.payload,
          timestamp: e.timestamp,
        })),
      };

      const res = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.studentId ? { 'X-Student-Id': this.studentId } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Sync failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as {
        processed: number;
        failed: number;
        results: Array<{
          client_event_id: string;
          status: string;
          error?: string;
        }>;
        canonical_mastery?: Array<{
          skill_id: string;
          p_mastery: number;
          state: 'not_learned' | 'partial' | 'mastered';
          attempts_count: number;
          correct_count: number;
        }>;
      };

      // 1. Resolve successfully processed or duplicate items
      const successIds: string[] = [];
      for (const r of data.results) {
        if (
          r.status === 'success' ||
          r.status === 'duplicate' ||
          r.status === 'replayed' ||
          r.status === 'processed'
        ) {
          successIds.push(r.client_event_id);
        } else {
          await markOutboxFailed(r.client_event_id, r.error ?? 'Server processing error');
        }
      }

      if (successIds.length > 0) {
        await resolveOutboxEvents(successIds);
      }

      // 2. Reconcile canonical server mastery if studentId is known
      if (data.canonical_mastery && this.studentId) {
        await applyCanonicalMastery(data.canonical_mastery, this.studentId);
      }

      this.isSyncing = false;
      this.lastSyncedAt = new Date().toISOString();
      this.syncError = null;
      this.retryCount = 0;
      this.notify();

      return {
        processed: data.processed,
        failed: data.failed,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.isSyncing = false;
      this.syncError = errorMsg;
      this.retryCount += 1;

      // Mark items as failed so they can be retried
      for (const id of ids) {
        await markOutboxFailed(id, errorMsg);
      }

      this.notify();
      this.scheduleExponentialBackoff();

      return { processed: 0, failed: pendingEvents.length };
    }
  }

  /**
   * Schedules next retry with exponential backoff and jitter.
   * Delay = min(30s, 1.5^retry * 1000) + jitter
   */
  private scheduleExponentialBackoff(): void {
    if (!this.isOnline) return;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const baseDelay = Math.min(30000, Math.pow(1.5, this.retryCount) * 1000);
    const jitter = Math.random() * 500;
    const delay = Math.round(baseDelay + jitter);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.triggerSync();
    }, delay);
  }

  /**
   * Resets retry state and forces an immediate sync attempt.
   */
  public async forceSync(): Promise<{ processed: number; failed: number }> {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryCount = 0;
    return this.triggerSync();
  }
}

// Global singleton instance
export const syncManager = new SyncManager();
