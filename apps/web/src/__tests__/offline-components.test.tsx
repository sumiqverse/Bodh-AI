import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { SharedDeviceLogoutModal } from '@/components/offline/SharedDeviceLogoutModal';
import { syncManager } from '@/lib/offline/sync';
import { clearOfflineDatabase, enqueueOutboxAttempt, getOfflineDB } from '@/lib/offline/db';

describe('Offline UI Components', () => {
  beforeEach(async () => {
    const db = getOfflineDB();
    await clearOfflineDatabase(db);
    vi.restoreAllMocks();
  });

  describe('OfflineIndicator', () => {
    it('renders online status when online and no pending events', () => {
      vi.spyOn(syncManager, 'getStatusSync').mockReturnValue({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        lastSyncedAt: null,
        error: null,
      });

      render(<OfflineIndicator locale="en" />);
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('renders offline indicator with pending count when offline', () => {
      vi.spyOn(syncManager, 'getStatusSync').mockReturnValue({
        isOnline: false,
        isSyncing: false,
        pendingCount: 3,
        lastSyncedAt: null,
        error: null,
      });

      render(<OfflineIndicator locale="en" />);
      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
      expect(screen.getByTestId('pending-count-badge')).toHaveTextContent('3');
    });

    it('renders pending sync badge and triggers manual sync when clicked', async () => {
      vi.spyOn(syncManager, 'getStatusSync').mockReturnValue({
        isOnline: true,
        isSyncing: false,
        pendingCount: 2,
        lastSyncedAt: null,
        error: null,
      });

      const triggerSyncSpy = vi
        .spyOn(syncManager, 'triggerSync')
        .mockResolvedValue({ processed: 2, failed: 0 });

      render(<OfflineIndicator locale="en" />);
      const syncBtn = screen.getByTestId('sync-now-button');
      expect(syncBtn).toBeInTheDocument();

      fireEvent.click(syncBtn);

      expect(triggerSyncSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('SharedDeviceLogoutModal', () => {
    it('prompts user and displays pending attempts when count > 0', async () => {
      const db = getOfflineDB();
      await enqueueOutboxAttempt({ attempt: 'test-unsynced' }, 'attempt_submission', db);

      const onLogoutComplete = vi.fn();
      const onClose = vi.fn();

      render(
        <SharedDeviceLogoutModal
          isOpen={true}
          onClose={onClose}
          onLogoutComplete={onLogoutComplete}
          locale="en"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('shared-device-logout-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Unsynced Attempts Detected')).toBeInTheDocument();
      expect(screen.getByTestId('sync-first-logout-btn')).toBeInTheDocument();
      expect(screen.getByTestId('wipe-confirm-logout-btn')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('wipe-confirm-logout-btn'));

      await waitFor(() => {
        expect(onLogoutComplete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
