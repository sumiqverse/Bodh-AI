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
      className={`rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-card text-ink dark:text-white ${className}`}
      aria-labelledby="offline-pack-heading"
      data-testid="chapter-download-manager"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-dashed border-ink/20 pb-5">
        <div>
          <h2
            id="offline-pack-heading"
            className="font-serif text-xl sm:text-2xl font-black text-ink dark:text-white tracking-tight"
          >
            {t('offline.download.title', locale)}
          </h2>
          <p className="text-xs font-medium text-text-secondary dark:text-muted-foreground mt-0.5">
            {t('offline.download.available_offline', locale)}
          </p>
        </div>

        {quotaInfo && (
          <div
            className="flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-xs font-bold text-ink shadow-xs"
            role="status"
            aria-label={`${t('offline.download.storage_used', locale)}: ${formatMB(quotaInfo.usedBytes)} MB of ${formatMB(quotaInfo.totalBytes)} MB`}
          >
            <HardDrive className="h-4 w-4 text-primary-orange shrink-0" aria-hidden="true" />
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
          className="mt-4 rounded-xl border-2 border-ink bg-red-100 dark:bg-red-950/60 p-3 text-xs font-bold text-red-800 dark:text-red-200 shadow-xs"
          data-testid="quota-error-alert"
        >
          {errorMessage}
        </div>
      )}

      <ul className="mt-5 space-y-3" role="list">
        {chapters.map((chapter) => {
          const isDownloaded = downloadedChapters.has(chapter.chapterId);
          const progress = downloadProgress[chapter.chapterId];
          const isDownloading = typeof progress === 'number';

          return (
            <li
              key={chapter.chapterId}
              className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card/70 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:translate-x-0.5 transition-transform"
              data-testid={`chapter-item-${chapter.chapterId}`}
            >
              <div className="space-y-1 min-w-0">
                <span className="inline-block text-[10px] font-black uppercase tracking-wider rounded-full border border-ink/40 bg-surface-yellow px-2.5 py-0.5 text-ink">
                  {chapter.subject} • Class {chapter.grade}
                </span>
                <p className="font-bold text-sm sm:text-base text-ink dark:text-white truncate">
                  {chapter.chapterTitle}
                </p>
                {chapter.estimatedSizeBytes && (
                  <span className="text-xs font-mono text-text-secondary dark:text-muted-foreground">
                    ~{formatMB(chapter.estimatedSizeBytes)} MB
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isDownloading ? (
                  <div className="flex items-center gap-2 w-36">
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full border border-ink bg-surface-cream"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${chapter.chapterTitle} ${t('offline.download.progress', locale)}`}
                    >
                      <div
                        className="h-full bg-primary-orange transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-ink dark:text-white">
                      {progress}%
                    </span>
                  </div>
                ) : isDownloaded ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('offline.download.ready', locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(chapter.chapterId)}
                      className="rounded-full border-2 border-ink bg-surface-white hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 p-2 shadow-xs transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
