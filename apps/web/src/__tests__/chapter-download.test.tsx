import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  BodhAIDatabase,
  clearOfflineDatabase,
  getLessonPack,
  getOfflineDB,
} from '@/lib/offline/db';
import {
  downloadChapterLessonPack,
  QuotaExceededError,
} from '@/lib/offline/lesson-pack-downloader';
import {
  ChapterDownloadManager,
  type ChapterDownloadItem,
} from '@/components/offline/ChapterDownloadManager';

describe('Chapter Download Manager & Lesson Pack Downloader', () => {
  let db: BodhAIDatabase;

  beforeEach(async () => {
    db = getOfflineDB();
    await clearOfflineDatabase(db);
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await clearOfflineDatabase(db);
  });

  const mockMeta = {
    chapterId: 'ch-test-101',
    curriculumId: 'ncert-math-6',
    grade: 6,
    subject: 'Mathematics',
    title: 'Fractions & Ratios',
    estimatedSizeBytes: 1024 * 1024,
  };

  it('downloads a chapter lesson pack and reports incremental progress', async () => {
    const progressUpdates: number[] = [];
    const pack = await downloadChapterLessonPack(mockMeta, (percent) => {
      progressUpdates.push(percent);
    });

    expect(pack.chapterId).toBe('ch-test-101');
    expect(pack.title).toBe('Fractions & Ratios');
    expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    expect(progressUpdates).toContain(100);

    const stored = await getLessonPack('ch-test-101', db);
    expect(stored).toBeDefined();
    expect(stored?.data.skills.length).toBeGreaterThan(0);
  });

  it('renders ChapterDownloadManager, initiates download, and allows deletion', async () => {
    const chapters: ChapterDownloadItem[] = [
      {
        chapterId: 'ch-test-101',
        chapterTitle: 'Fractions & Ratios',
        subject: 'Mathematics',
        grade: 6,
        estimatedSizeBytes: 1024 * 1024,
      },
    ];

    render(<ChapterDownloadManager chapters={chapters} locale="en" />);

    expect(screen.getByText('Fractions & Ratios')).toBeInTheDocument();
    const downloadBtn = screen.getByTestId('download-btn-ch-test-101');
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(downloadBtn);

    // Wait for download to finish
    await waitFor(() => {
      expect(screen.getByText('Downloaded')).toBeInTheDocument();
    });

    // Delete button should now be visible
    const deleteBtn = screen.getByTestId('delete-btn-ch-test-101');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('download-btn-ch-test-101')).toBeInTheDocument();
    });
  });

  it('handles QuotaExceededError when device storage is full', async () => {
    // Simulate quota exceeded
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          usage: 990 * 1024 * 1024,
          quota: 1000 * 1024 * 1024,
        }),
      },
      configurable: true,
      writable: true,
    });

    await expect(
      downloadChapterLessonPack({
        ...mockMeta,
        estimatedSizeBytes: 50 * 1024 * 1024,
      }),
    ).rejects.toThrow(QuotaExceededError);
  });
});
