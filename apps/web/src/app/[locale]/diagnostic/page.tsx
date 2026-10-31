'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Skeleton,
} from '@bodhai/ui';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { useDiagnostic } from '@/hooks/useDiagnostic';
import { KatexRenderer } from '@/components/katex-renderer';

export default function DiagnosticPage(): React.JSX.Element {
  const t = useTranslations('diagnostic');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const profileQuery = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: () => apiClient.getMyProfile(token || undefined),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const searchParams = useSearchParams();
  const paramCurriculum = searchParams.get('curriculum') ?? undefined;
  const rawProfile = profileQuery.data?.profile as Record<string, unknown> | undefined;
  const enrolledCurriculum =
    paramCurriculum ||
    (typeof rawProfile?.curriculumCode === 'string' ? rawProfile.curriculumCode : undefined) ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('bodhai_student_curriculum') || undefined
      : undefined);

  const {
    currentItem,
    questionNumber,
    totalQuestions,
    isCompleted,
    isLoading,
    isSubmitting,
    errorMessage,
    summary,
    startSession,
    submitAnswer,
    retry,
    feedback,
    advanceToNext,
    isPendingCompletion,
  } = useDiagnostic({
    curriculumCode: enrolledCurriculum,
    totalTarget: 15,
  });

  const targetCurriculum = enrolledCurriculum || 'NCERT-MATH-C8';
  const graphQuery = useQuery({
    queryKey: ['curriculum-graph', targetCurriculum],
    queryFn: () => apiClient.getCurriculumGraph(targetCurriculum),
    staleTime: 10 * 60 * 1000,
  });

  const skillNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (graphQuery.data?.nodes) {
      for (const node of graphQuery.data.nodes) {
        if (node.name) {
          map.set(String(node.id).toLowerCase(), node.name);
          map.set(String(node.code).toLowerCase(), node.name);
        }
      }
    }
    return map;
  }, [graphQuery.data]);

  const formatSkillName = React.useCallback(
    (item: unknown): string => {
      if (!item) return '';
      if (typeof item === 'object' && item !== null) {
        const obj = item as { name?: string; code?: string; id?: string };
        return obj.name || obj.code || obj.id || '';
      }
      const raw = String(item).trim();
      const mapped = skillNameMap.get(raw.toLowerCase());
      if (mapped) return mapped;
      return raw;
    },
    [skillNameMap],
  );

  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [startTime, setStartTime] = React.useState<number>(Date.now());

  // Reset timer on question change
  React.useEffect(() => {
    setStartTime(Date.now());
    setSelectedOption(null);
  }, [currentItem?.question_id]);

  const handleSelectOption = (optId: string): void => {
    if (isSubmitting || feedback) return;
    setSelectedOption(optId);
  };

  const handleConfirmNext = async (): Promise<void> => {
    if (feedback) {
      advanceToNext();
      return;
    }
    if (!selectedOption || isSubmitting) return;
    const elapsed = Math.max(1000, Date.now() - startTime);
    try {
      await submitAnswer(selectedOption, elapsed);
    } catch {
      // Handled via errorMessage state
    }
  };

  // Keyboard navigation: 1-4 for options, Enter/Space to submit or advance
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (feedback) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advanceToNext();
        }
        return;
      }
      if (isSubmitting || !currentItem?.options) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const opt = currentItem.options[index];
        if (opt) {
          setSelectedOption(opt.id);
        }
      } else if (e.key === 'Enter' && selectedOption) {
        void handleConfirmNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem?.options, isSubmitting, selectedOption, feedback, advanceToNext]);

  // Loading skeleton state for slow network connections
  if (isLoading || (!currentItem && !isCompleted && !errorMessage)) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-4 py-8">
        <Card className="w-full space-y-6 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={t('progressLabel')}
            aria-busy="true"
          >
            <div className="h-full bg-primary/40 animate-pulse w-1/12" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  // Error state with retry or access pending guard
  if (errorMessage && !currentItem) {
    const isPendingApproval =
      errorMessage.toLowerCase().includes('pending') ||
      errorMessage.toLowerCase().includes('approval');

    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center px-4 py-8">
        <Card
          className={`w-full text-center p-6 ${
            isPendingApproval ? 'border-amber-500/40 bg-amber-500/5' : 'border-destructive/30'
          }`}
        >
          <CardHeader>
            <div
              className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${
                isPendingApproval
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {isPendingApproval ? '🔒' : '⚠️'}
            </div>
            <CardTitle className="text-xl font-bold">
              {isPendingApproval ? 'Teacher Approval Required' : t('emptyState')}
            </CardTitle>
            <CardDescription
              className={`text-sm font-medium mt-2 ${
                isPendingApproval ? 'text-amber-800 dark:text-amber-200' : 'text-destructive'
              }`}
            >
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => router.push('/student')}
              className="w-full min-h-[44px] cursor-pointer"
            >
              ← Back to My Classes
            </Button>
            {!isPendingApproval && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={retry}
                className="w-full min-h-[44px] cursor-pointer"
              >
                {t('retryButton')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed Diagnostic state — Clear results, foundational summary, and next learning path
  if (isCompleted) {
    const totalAnswered = (summary?.total_questions as number) ?? Math.max(0, questionNumber - 1);
    const masteredSkills = (summary?.mastered_skills as string[]) ?? [];
    const partialSkills = (summary?.partial_skills as string[]) ?? [];
    const focusGaps =
      (summary?.root_cause_gaps as string[]) ?? (summary?.not_learned_skills as string[]) ?? [];
    const recommendedSkills = (summary?.recommended_starting_skills as string[]) ?? [];

    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-4 py-8">
        <Card className="w-full shadow-floating text-center border-border/80">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <CardTitle className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('completedTitle')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t('completedSubtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2 text-left">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <span className="block text-2xl font-extrabold text-foreground">
                  {totalAnswered}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Questions Assessed
                </span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <span className="block text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {masteredSkills.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">Mastered</span>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <span className="block text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {focusGaps.length + partialSkills.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">Focus Gaps</span>
              </div>
            </div>

            {/* Strengths / Mastered Skills */}
            {masteredSkills.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  ✓ Strong Foundational Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((sk, idx) => (
                    <Badge
                      key={typeof sk === 'string' ? sk : idx}
                      variant="outline"
                      size="sm"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs font-medium"
                    >
                      {formatSkillName(sk)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Focus Areas / Gaps */}
            {(focusGaps.length > 0 || recommendedSkills.length > 0) && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  🎯 Recommended Starting Focus
                </span>
                <p className="text-xs text-muted-foreground">
                  Our diagnostic engine has calibrated specific learning pathways for you in:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(recommendedSkills.length > 0 ? recommendedSkills : focusGaps).map((sk, idx) => (
                    <Badge
                      key={typeof sk === 'string' ? sk : idx}
                      variant="outline"
                      size="sm"
                      className="border-primary/30 bg-primary/10 text-primary text-xs font-medium"
                    >
                      {formatSkillName(sk)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed text-center">
              {t('hintFreeNotice')}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void startSession()}
                className="w-full min-h-[48px] cursor-pointer font-semibold"
              >
                {t('retakeDiagnostic')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => router.push('/student')}
                className="w-full min-h-[48px] cursor-pointer font-semibold shadow-elevated"
              >
                {t('viewSkillMap')} →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Diagnostic Question
  const progressPercent = Math.min(100, Math.round((questionNumber / totalQuestions) * 100));

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-4 py-6 sm:py-10">
      <Card className="w-full shadow-floating border-border/80">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span aria-live="polite">
              {t('questionProgress', { current: questionNumber, total: totalQuestions })}
            </span>
          </div>

          {/* Smooth progress indicator bar */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('progressLabel')}
          >
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Question Prompt with KaTeX Math rendering */}
          <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {currentItem?.topic_name ||
                  formatSkillName(currentItem?.skill_code) ||
                  'NCERT Class 8'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                {currentItem?.code}
              </span>
            </div>
            <div className="text-base sm:text-lg text-foreground font-medium leading-relaxed">
              <KatexRenderer content={currentItem?.prompt || ''} />
            </div>
          </div>

          {/* Options List or Numerical Input Field */}
          {currentItem?.options && currentItem.options.length > 0 ? (
            <div className="space-y-2.5" role="radiogroup" aria-label={t('selectOptionPrompt')}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('selectOptionPrompt')}
              </p>

              {currentItem.options.map((opt, idx) => {
                const isSelected = selectedOption === opt.id;
                const isCorrectAnswer = feedback?.correctAnswerId === opt.id;
                const isWrongSelection = Boolean(feedback && isSelected && !feedback.isCorrect);
                const isCorrectSelection = Boolean(feedback && isSelected && feedback.isCorrect);

                let optionStyle =
                  'border-border bg-card hover:border-primary/50 hover:bg-muted/30 text-foreground';
                let badgeStyle = 'border-border bg-muted/50 text-muted-foreground';
                let badgeContent: React.ReactNode = opt.id;

                if (feedback) {
                  if (isCorrectSelection) {
                    optionStyle =
                      'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500 font-semibold shadow-xs';
                    badgeStyle = 'border-emerald-600 bg-emerald-600 text-white font-bold';
                    badgeContent = '✓';
                  } else if (isWrongSelection) {
                    optionStyle =
                      'border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500 font-semibold shadow-xs';
                    badgeStyle = 'border-rose-600 bg-rose-600 text-white font-bold';
                    badgeContent = '✕';
                  } else if (isCorrectAnswer) {
                    optionStyle =
                      'border-emerald-500/60 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/60 font-semibold';
                    badgeStyle =
                      'border-emerald-600/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold';
                    badgeContent = '✓';
                  } else {
                    optionStyle = 'opacity-40 border-border bg-card/40 text-muted-foreground';
                  }
                } else if (isSelected) {
                  optionStyle =
                    'border-primary bg-primary/10 shadow-xs ring-1 ring-primary text-foreground font-semibold';
                  badgeStyle = 'border-primary bg-primary text-primary-foreground font-bold';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isSubmitting || Boolean(feedback)}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${optionStyle} ${
                      isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${badgeStyle}`}
                      >
                        {badgeContent}
                      </span>
                      <div className="text-sm sm:text-base font-normal">
                        <KatexRenderer content={opt.text} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {feedback && !feedback.isCorrect && isCorrectAnswer && (
                        <Badge
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 text-white text-[10px] uppercase font-bold py-0.5 px-2"
                        >
                          {t('correctAnswerBadge')}
                        </Badge>
                      )}
                      <span
                        className="text-xs text-muted-foreground font-mono ml-2 hidden sm:inline"
                        aria-hidden="true"
                      >
                        [{idx + 1}]
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="numeric-answer-input"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
              >
                {t('enterNumericalAnswer')}
              </label>
              <div className="relative">
                <input
                  id="numeric-answer-input"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  disabled={isSubmitting || Boolean(feedback)}
                  value={selectedOption || ''}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedOption && !feedback) {
                      void handleConfirmNext();
                    }
                  }}
                  placeholder="Type your number here (e.g. 18)..."
                  className={`w-full rounded-2xl border px-5 py-4 text-xl sm:text-2xl font-bold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                    feedback
                      ? feedback.isCorrect
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500'
                        : 'border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500'
                      : 'border-border bg-card text-foreground focus:border-primary shadow-xs'
                  } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {feedback && (
                  <span
                    className={`absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-sm ${
                      feedback.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {feedback.isCorrect ? '✓' : '✕'}
                  </span>
                )}
              </div>

              {feedback && !feedback.isCorrect && feedback.correctAnswerId && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                  <span>✓ Correct Answer:</span>
                  <span className="font-mono text-base font-bold">{feedback.correctAnswerId}</span>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive font-medium"
            >
              {errorMessage}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6 flex flex-col items-stretch gap-4">
          {feedback ? (
            <div
              className={`w-full rounded-2xl p-4 sm:p-5 border transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                feedback.isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-xs ${
                      feedback.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {feedback.isCorrect ? '✓' : '✕'}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base sm:text-lg font-bold leading-snug">
                      {isPendingCompletion
                        ? feedback.isCorrect
                          ? t('diagnosticCompleteSuccess')
                          : t('diagnosticCompleted')
                        : feedback.isCorrect
                          ? t('excellentSuccess')
                          : t('workOnWeakness')}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {isPendingCompletion
                        ? t('viewSummaryDesc')
                        : feedback.isCorrect
                          ? t('scoreIncreasedDesc')
                          : `${t('correctAnswerWas', { option: feedback.correctAnswerId || '' })} ${
                              feedback.isWeaknessReview
                                ? t('weaknessAdaptedDesc')
                                : t('learnFromMistakeDesc')
                            }`}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => advanceToNext()}
                  className={`min-h-[48px] px-8 text-base font-bold shadow-elevated cursor-pointer shrink-0 ${
                    feedback.isCorrect
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                >
                  {isPendingCompletion ? 'View Results & Summary →' : 'Continue →'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!selectedOption || isSubmitting}
              onClick={() => void handleConfirmNext()}
              className="w-full min-h-[48px] cursor-pointer text-base font-semibold shadow-elevated"
            >
              {isSubmitting ? t('submitting') : t('submitAnswer')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
