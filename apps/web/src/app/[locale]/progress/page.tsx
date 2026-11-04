'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import { useProgressHistory, type ProgressHistoryItem } from '@/hooks/useProgressHistory';

export default function ProgressPage(): React.JSX.Element {
  const t = useTranslations('progress');
  const tCommon = useTranslations('common');
  const apiClient = getWebApiClient();

  const [mounted, setMounted] = React.useState<boolean>(false);
  const [selectedCurriculum, setSelectedCurriculum] = React.useState<string>('NCERT-MATH-C8');

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const profileQuery = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: () => apiClient.getMyProfile(token || undefined),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const enrolledClasses = React.useMemo(() => {
    const raw = profileQuery.data?.profile as Record<string, unknown> | undefined;
    if (!raw) return [];
    const rawClasses = raw.classes as
      Array<{ classId: string; name: string; curriculumCode: string }> | undefined;
    if (Array.isArray(rawClasses) && rawClasses.length > 0) {
      return rawClasses;
    }
    if (raw.className && raw.curriculumCode) {
      return [
        {
          classId: String(raw.classId || 'default-class'),
          name: String(raw.className),
          curriculumCode: String(raw.curriculumCode),
        },
      ];
    }
    return [];
  }, [profileQuery.data?.profile]);

  const availableTabs = React.useMemo(() => {
    if (enrolledClasses.length > 0) {
      return enrolledClasses.map((c) => ({
        code: c.curriculumCode,
        label: c.name,
      }));
    }
    return [
      { code: 'NCERT-MATH-C8', label: 'Class 8 Mathematics' },
      { code: 'NCERT-SCIE-C8', label: 'Class 8 Science' },
      { code: 'NCERT-ENGL-C8', label: 'Class 8 English' },
      { code: 'NCERT-HIND-C8', label: 'Class 8 Hindi' },
      { code: 'NCERT-SOCI-C8', label: 'Class 8 Social Science' },
      { code: 'NCERT-ENGL-C7', label: 'Class 7 English' },
      { code: 'NCERT-MATH-C7', label: 'Class 7 Mathematics' },
      { code: 'NCERT-MATH-C9', label: 'Class 9 Mathematics' },
      { code: 'NCERT-SCIE-C9', label: 'Class 9 Science' },
      { code: 'NCERT-MATH-C10', label: 'Class 10 Mathematics' },
    ];
  }, [enrolledClasses]);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bodhai_student_curriculum');
      if (saved) {
        setSelectedCurriculum(saved);
      } else if (availableTabs.length > 0 && availableTabs[0]) {
        setSelectedCurriculum(availableTabs[0].code);
      }
    }
  }, [availableTabs]);

  const { historyItems, stats, isLoading, error, refetch } = useProgressHistory(selectedCurriculum);

  if (!mounted || isLoading) {
    return (
      <main className="min-h-screen bg-canvas-gradient px-4 py-8 sm:py-12 flex justify-center text-ink">
        <div className="w-full max-w-4xl space-y-6">
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-12 text-center shadow-card space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center mx-auto shadow-xs animate-spin">
              <span className="text-xl">✨</span>
            </div>
            <p className="text-xs font-bold text-text-secondary dark:text-muted-foreground">
              Loading progress and curriculum mastery...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-canvas-gradient px-4 py-16 flex justify-center text-ink">
        <div className="w-full max-w-md">
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-8 text-center shadow-card space-y-4">
            <h2 className="font-serif text-2xl font-black text-ink dark:text-white">
              {t('errorTitle')}
            </h2>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error.message}</p>
            <button
              type="button"
              onClick={refetch}
              className="w-full py-2.5 px-4 rounded-full border-2 border-ink bg-primary-orange text-white font-bold text-xs shadow-xs hover:bg-primary-orange-dark cursor-pointer"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas-gradient px-4 py-8 sm:py-12 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border-2 border-ink bg-surface-white dark:bg-card px-3.5 py-1 shadow-xs hover:bg-surface-cream transition-colors mb-3"
            >
              ← {tCommon('backToHome')}
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-ink dark:text-white tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-text-secondary dark:text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>

          <Link
            href="/student"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
          >
            {t('startPracticing')} →
          </Link>
        </div>

        {/* Curriculum / Subject Quick Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist">
          {availableTabs.map((c) => (
            <button
              key={c.code}
              type="button"
              role="tab"
              aria-selected={selectedCurriculum === c.code}
              onClick={() => setSelectedCurriculum(c.code)}
              className={`shrink-0 rounded-full border-2 border-ink px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedCurriculum === c.code
                  ? 'bg-primary-orange text-white shadow-xs'
                  : 'bg-surface-white dark:bg-card text-ink dark:text-white hover:bg-surface-cream'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Stats Cards - design.md Section 3.2 */}
        <section
          aria-label="Progress Statistics"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="rounded-2xl border-2 border-ink bg-surface-cream p-4 shadow-card text-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/75 block">
              {t('statMastered')}
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-black text-ink mt-1 block">
              {stats.masteredSkills}
            </span>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-surface-yellow p-4 shadow-card text-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/75 block">
              {t('statPartial')}
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-black text-ink mt-1 block">
              {stats.partialSkills}
            </span>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-4 shadow-card text-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary dark:text-muted-foreground block">
              {t('statNotLearned')}
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-black text-ink dark:text-white mt-1 block">
              {stats.notLearnedSkills}
            </span>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-surface-blue p-4 shadow-card text-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/75 block">
              {t('statAccuracy')}
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-black text-ink mt-1 block">
              {stats.overallAccuracy}%
            </span>
          </div>
        </section>

        {/* Progress Timeline List */}
        <section aria-label={t('historyHeading')} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-black text-ink dark:text-white tracking-tight">
              {t('historyHeading')}
            </h2>
            <span className="text-xs font-bold text-text-secondary dark:text-muted-foreground">
              {historyItems.length} Competencies Tracked
            </span>
          </div>

          {historyItems.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-ink/40 bg-surface-white dark:bg-card p-10 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center text-2xl shadow-xs">
                📊
              </div>
              <h3 className="font-serif text-lg font-bold text-ink dark:text-white">
                {t('emptyTitle')}
              </h3>
              <p className="text-xs text-text-secondary dark:text-muted-foreground max-w-sm mx-auto">
                {t('emptyDesc')}
              </p>
              <div className="pt-2">
                <Link
                  href="/diagnostic"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-primary-orange text-white px-5 py-2 text-xs font-bold shadow-xs hover:bg-primary-orange-dark cursor-pointer"
                >
                  Take Diagnostic Test →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item: ProgressHistoryItem) => (
                <div
                  key={item.skillId}
                  className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:translate-x-0.5 transition-transform"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base sm:text-lg text-ink dark:text-white">
                        {item.skillName}
                      </span>
                      <span
                        className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${
                          item.state === 'mastered'
                            ? 'bg-emerald-600 text-white border-ink/40'
                            : item.state === 'partial'
                              ? 'bg-surface-yellow text-ink border-2 border-ink'
                              : 'bg-surface-white dark:bg-muted text-text-secondary border-2 border-ink/30'
                        }`}
                      >
                        {item.state === 'mastered'
                          ? t('stateMastered')
                          : item.state === 'partial'
                            ? t('stateInProgress')
                            : t('stateNotStarted')}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary dark:text-muted-foreground">
                      {item.topicName} •{' '}
                      {t('accuracyDetails', {
                        accuracy: item.accuracyPercentage,
                        correct: item.correctCount,
                        attempts: item.attemptsCount,
                      })}
                    </p>
                    {item.rationale && (
                      <p className="text-xs text-text-secondary/80 italic pt-0.5">
                        {item.rationale}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      href={`/solve?skillId=${item.skillId}`}
                      className="inline-flex items-center rounded-full border-2 border-ink bg-surface-white dark:bg-card px-3.5 py-1.5 text-xs font-bold text-ink dark:text-white shadow-xs hover:bg-surface-cream transition-colors cursor-pointer"
                    >
                      {t('practiceAction')}
                    </Link>
                    <Link
                      href={`/test?skillId=${item.skillId}`}
                      className="inline-flex items-center rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-white px-4 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      {t('testAction')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
