'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Wrench, Clock, RefreshCw, WifiOff } from 'lucide-react';

export default function MaintenancePage(): React.ReactElement {
  const t = useTranslations('maintenance');
  const tCommon = useTranslations('common');

  const handleRefresh = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <main
      id="main-content"
      role="main"
      className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-16 text-center"
      aria-labelledby="maintenance-heading"
    >
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 shadow-lg dark:border-amber-900/50 dark:bg-zinc-900 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <Wrench className="h-8 w-8 animate-pulse" aria-hidden="true" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('badge')}
        </span>

        <h1
          id="maintenance-heading"
          className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl"
        >
          {t('title')}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('description')}
        </p>

        <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-left text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          <div className="flex items-start gap-3">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <p className="font-medium">{t('estimatedRestoration')}</p>
          </div>
          <div className="mt-3 flex items-start gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-700/60">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('offlineNotice')}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            aria-label="Refresh page to check if maintenance is complete"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tCommon('tryDiagnostic')}
          </button>
        </div>

        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">{t('supportContact')}</p>
      </div>
    </main>
  );
}
