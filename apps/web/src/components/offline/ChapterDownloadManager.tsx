'use client';

import * as React from 'react';
import { Check, Download, HardDrive, Trash2 } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import {
  deleteLessonPack,
  getLessonPack,
  getStorageQuota,
  type StorageQuotaInfo,
} from '@/lib/offline/db';
import {
  downloadChapterLessonPack,
  QuotaExceededError,
} from '@/lib/offline/lesson-pack-downloader';

export interface ChapterDownloadItem {
  readonly chapterId: string;
  readonly chapterTitle: string;
  readonly subject: string;
  readonly grade: number;
  readonly estimatedSizeBytes?: number;
}

export interface ChapterDownloadManagerProps {
  readonly chapters: readonly ChapterDownloadItem[];
  readonly locale?: Locale;
  readonly className?: string;
}

export function ChapterDownloadManager({
  chapters,
  locale = 'en',
  className = '',
}: ChapterDownloadManagerProps): React.JSX.Element {
  const [downloadedChapters, setDownloadedChapters] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const [downloadProgress, setDownloadProgress] = React.useState<Readonly<Record<string, number>>>(
    {},
  );
  const [quotaInfo, setQuotaInfo] = React.useState<StorageQuotaInfo | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Load existing downloaded chapters and storage quota
  const refreshStorageState = React.useCallback(async () => {
    try {
      const quota = await getStorageQuota();
      setQuotaInfo(quota);

      const downloadedSet = new Set<string>();
      for (const chapter of chapters) {
        const pack = await getLessonPack(chapter.chapterId);
        if (pack) {
          downloadedSet.add(chapter.chapterId);
        }
      }
      setDownloadedChapters(downloadedSet);
    } catch (err: unknown) {
      console.warn('Failed to load storage state:', err);
    }
  }, [chapters]);

  React.useEffect(() => {
    void refreshStorageState();
  }, [refreshStorageState]);

  const handleDownload = React.useCallback(
    async (chapterId: string) => {
      const chapter = chapters.find((c) => c.chapterId === chapterId);
      if (!chapter) return;

      setErrorMessage(null);
      setDownloadProgress((prev) => ({ ...prev, [chapterId]: 5 }));

      try {
        await downloadChapterLessonPack(
          {
            chapterId: chapter.chapterId,
            curriculumId: 'ncert-curriculum',
            grade: chapter.grade,
            subject: chapter.subject,
            title: chapter.chapterTitle,
            estimatedSizeBytes: chapter.estimatedSizeBytes ?? 1.2 * 1024 * 1024,
          },
          (progress) => {
            setDownloadProgress((prev) => ({ ...prev, [chapterId]: progress }));
          },
        );

        setDownloadedChapters((prev) => new Set([...prev, chapterId]));
        await refreshStorageState();
      } catch (err: unknown) {
        if (err instanceof QuotaExceededError) {
          setErrorMessage(t('offline.download.quota_exceeded', locale));
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Download failed');
        }
      } finally {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[chapterId];
          return next;
        });
      }
    },
    [locale, refreshStorageState],
  );

  const handleDelete = React.useCallback(
    async (chapterId: string) => {
      try {
        await deleteLessonPack(chapterId);
        setDownloadedChapters((prev) => {
          const next = new Set(prev);
          next.delete(chapterId);
          return next;
        });
        await refreshStorageState();
      } catch (err: unknown) {
        console.warn('Failed to delete chapter:', err);
      }
    },
    [refreshStorageState],
  );

  const formatMB = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <section
      className={`rounded-xl border border-slate-700 bg-slate-900/80 p-5 text-slate-100 shadow-md ${className}`}
      aria-labelledby="offline-pack-heading"
      data-testid="chapter-download-manager"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 id="offline-pack-heading" className="text-lg font-semibold tracking-tight text-white">
            {t('offline.download.title', locale)}
          </h2>
          <p className="text-xs text-slate-400">
            {t('offline.download.available_offline', locale)}
          </p>
        </div>

        {quotaInfo && (
          <div
            className="flex items-center gap-2 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs text-slate-300"
            role="status"
            aria-label={`${t('offline.download.storage_used', locale)}: ${formatMB(quotaInfo.usedBytes)} MB of ${formatMB(quotaInfo.totalBytes)} MB`}
          >
            <HardDrive className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>
              {formatMB(quotaInfo.usedBytes)} MB / {formatMB(quotaInfo.totalBytes)} MB (
              {quotaInfo.percentUsed}%)
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300"
          data-testid="quota-error-alert"
        >
          {errorMessage}
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-800/80" role="list">
        {chapters.map((chapter) => {
          const isDownloaded = downloadedChapters.has(chapter.chapterId);
          const progress = downloadProgress[chapter.chapterId];
          const isDownloading = typeof progress === 'number';

          return (
            <li
              key={chapter.chapterId}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-2"
              data-testid={`chapter-item-${chapter.chapterId}`}
            >
              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-wider text-sky-400">
                  {chapter.subject} • Class {chapter.grade}
                </span>
                <p className="truncate font-medium text-sm text-slate-200">
                  {chapter.chapterTitle}
                </p>
                {chapter.estimatedSizeBytes && (
                  <span className="text-[11px] text-slate-500">
                    ~{formatMB(chapter.estimatedSizeBytes)} MB
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isDownloading ? (
                  <div className="flex items-center gap-2 w-36">
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${chapter.chapterTitle} ${t('offline.download.progress', locale)}`}
                    >
                      <div
                        className="h-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{progress}%</span>
                  </div>
                ) : isDownloaded ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 text-xs font-medium text-emerald-300">
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      {t('offline.download.ready', locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(chapter.chapterId)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label={`${t('offline.download.delete', locale)} ${chapter.chapterTitle}`}
                      data-testid={`delete-btn-${chapter.chapterId}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleDownload(chapter.chapterId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-colors"
                    aria-label={`${t('offline.download.action', locale)} ${chapter.chapterTitle}`}
                    data-testid={`download-btn-${chapter.chapterId}`}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('offline.download.action', locale)}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
