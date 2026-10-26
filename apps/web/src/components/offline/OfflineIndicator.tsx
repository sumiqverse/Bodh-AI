'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import { syncManager, type SyncStatus } from '@/lib/offline/sync';

export interface OfflineIndicatorProps {
  readonly locale?: Locale;
  readonly className?: string;
}

export function OfflineIndicator({
  locale = 'en',
  className = '',
}: OfflineIndicatorProps): React.JSX.Element {
  const [status, setStatus] = React.useState<SyncStatus>(() => syncManager.getStatusSync());

  React.useEffect(() => {
    void syncManager.getStatus().then((s) => setStatus(s));
    return syncManager.subscribe((nextStatus) => {
      setStatus(nextStatus);
    });
  }, []);

  const handleManualSync = React.useCallback(async () => {
    if (status.isOnline && !status.isSyncing) {
      await syncManager.triggerSync();
    }
  }, [status.isOnline, status.isSyncing]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        !status.isOnline
          ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
          : status.isSyncing
            ? 'bg-sky-950/40 text-sky-300 border-sky-800/60'
            : status.pendingCount > 0
              ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60'
              : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
      } ${className}`}
      data-testid="offline-indicator"
    >
      {!status.isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>{t('offline.status.offline', locale)}</span>
          {status.pendingCount > 0 && (
            <span
              className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-200"
              data-testid="pending-count-badge"
            >
              {status.pendingCount}
            </span>
          )}
        </>
      ) : status.isSyncing ? (
        <>
          <RefreshCw
            className="h-3.5 w-3.5 animate-spin text-sky-400 shrink-0"
            aria-hidden="true"
          />
          <span>{t('offline.status.syncing', locale)}</span>
        </>
      ) : status.pendingCount > 0 ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
          <span>
            {status.pendingCount} {t('offline.sync.pending', locale)}
          </span>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={status.isSyncing}
            className="ml-1 rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={t('offline.sync.now', locale)}
            data-testid="sync-now-button"
          >
            {t('offline.sync.now', locale)}
          </button>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{t('offline.status.online', locale)}</span>
        </>
      )}
    </div>
  );
}
