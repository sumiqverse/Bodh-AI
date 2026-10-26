'use client';

import * as React from 'react';
import { AlertTriangle, LogOut, RefreshCw, X } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import { clearOfflineDatabase, getPendingOutboxCount } from '@/lib/offline/db';
import { syncManager } from '@/lib/offline/sync';

export interface SharedDeviceLogoutModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onLogoutComplete: () => void;
  readonly locale?: Locale;
}

export function SharedDeviceLogoutModal({
  isOpen,
  onClose,
  onLogoutComplete,
  locale = 'en',
}: SharedDeviceLogoutModalProps): React.JSX.Element | null {
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [isLoadingCount, setIsLoadingCount] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoadingCount(true);
      getPendingOutboxCount()
        .then((count) => {
          setPendingCount(count);
          setIsLoadingCount(false);
          // If no unsynced data, directly wipe and proceed
          if (count === 0) {
            void clearOfflineDatabase().then(() => {
              onLogoutComplete();
            });
          }
        })
        .catch(() => {
          setIsLoadingCount(false);
        });
    }
  }, [isOpen, onLogoutComplete]);

  // If closed or still determining count, or count is 0 (auto-proceeding)
  if (!isOpen || isLoadingCount || pendingCount === 0) {
    return null;
  }

  const handleSyncThenLogout = async () => {
    setIsSyncing(true);
    try {
      await syncManager.triggerSync();
      await clearOfflineDatabase();
      onLogoutComplete();
    } catch {
      // If sync failed, prompt user or keep modal open
      const remaining = await getPendingOutboxCount();
      setPendingCount(remaining);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWipeAndLogout = async () => {
    await clearOfflineDatabase();
    onLogoutComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-warning-title"
      aria-describedby="logout-warning-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      data-testid="shared-device-logout-modal"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-amber-600/40 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label={t('offline.logout.cancel', locale)}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 text-amber-400 mb-3">
          <div className="rounded-full bg-amber-500/10 p-2.5">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id="logout-warning-title" className="text-lg font-bold text-white">
            {t('offline.logout.warning_title', locale)}
          </h2>
        </div>

        <p id="logout-warning-desc" className="text-sm text-slate-300 leading-relaxed">
          {t('offline.logout.warning_desc', locale)}
        </p>

        <div className="mt-3 rounded-lg bg-amber-950/40 border border-amber-800/60 px-3 py-2 text-xs font-medium text-amber-200">
          {pendingCount} {t('offline.sync.pending', locale)}
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSyncThenLogout()}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 transition-colors"
            data-testid="sync-first-logout-btn"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            {t('offline.logout.sync_first', locale)}
          </button>

          <button
            type="button"
            onClick={() => void handleWipeAndLogout()}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600/20 border border-red-700/60 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
            data-testid="wipe-confirm-logout-btn"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('offline.logout.wipe_confirm', locale)}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
            data-testid="cancel-logout-btn"
          >
            {t('offline.logout.cancel', locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
