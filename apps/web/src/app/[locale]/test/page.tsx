'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trophy, Check, RotateCcw, ArrowRight } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  buttonVariants,
  Badge,
  Skeleton,
} from '@bodhai/ui';
import { useTest } from '@/hooks/useTest';
import { KatexRenderer } from '@/components/katex-renderer';
import { getCurrentUser } from '@/lib/api-client';

function TestSkeleton(): React.JSX.Element {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-4 py-8">
      <Card className="w-full space-y-6 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </Card>
    </div>
  );
}

function TestContent(): React.JSX.Element {
  const t = useTranslations('test');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();

  const skillId = searchParams.get('skillId') ?? undefined;

  const {
    isLoading,
    currentIndex,
    currentQuestion,
    totalQuestions,
    isCompleted,
    isSubmitting,
    result,
    submitAnswer,
    resetTest,
    error,
  } = useTest({ skillId });

  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = React.useState<string>('/student');

  React.useEffect(() => {
    const user = getCurrentUser();
    if (user?.role === 'teacher') {
      setDashboardPath('/classes');
    } else if (user?.role === 'admin') {
      setDashboardPath('/admin/stats');
    } else {
      setDashboardPath('/student');
    }
  }, []);

  // Clear choice on question advance
  React.useEffect(() => {
    setSelectedOption(null);
  }, [currentIndex]);

  const handleConfirmAnswer = async (): Promise<void> => {
    if (!selectedOption || isSubmitting) return;
    try {
      await submitAnswer(selectedOption);
    } catch {
      // Handled in submitMutation
    }
  };

  // Completed Test State — Clear 'mastery check' framing & outcome
  if (isCompleted && result) {
    const accuracyPercent = Math.round(
      (result.correctAnswers / Math.max(result.totalQuestions, 1)) * 100,
    );

    return (
      <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card text-center shadow-shell relative overflow-hidden p-2 sm:p-4">
          {/* Subtle Decorative Arc */}
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-surface-butter/60 border-2 border-ink/10 pointer-events-none" />

          <CardHeader className="pb-4 relative z-10">
            {/* Visual Icon Badge (Replaces generic emoji with crisp SVG iconography) */}
            <div
              className={`relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-ink shadow-card transition-transform hover:scale-105 ${
                result.isMastered ? 'bg-surface-yellow text-ink' : 'bg-surface-peach text-ink'
              }`}
            >
              {result.isMastered ? (
                <>
                  <Trophy className="h-10 w-10 text-ink stroke-[2.2]" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-emerald-500 text-white shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                </>
              ) : (
                <RotateCcw className="h-9 w-9 text-ink stroke-[2.2]" />
              )}
            </div>

            {/* Status Pill */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-xs mb-3 mx-auto ${
                result.isMastered
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'bg-surface-cream text-ink dark:bg-card dark:text-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  result.isMastered ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{result.isMastered ? 'Mastery Verified' : 'Practice Progress'}</span>
            </div>

            <CardTitle className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
              {t('testCompletedTitle')}
            </CardTitle>

            <CardDescription className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed font-medium">
              {result.isMastered ? t('masteredCongratulations') : t('needsPracticeAdvice')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2 relative z-10">
            {/* Assessment Telemetry Box */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream/70 dark:bg-card p-5 space-y-3 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-ink/15 pb-2 text-xs font-mono font-black uppercase text-ink/70 dark:text-muted-foreground">
                <span>Assessment Outcome</span>
                <span
                  className={`px-2 py-0.5 rounded-md border border-ink/20 font-bold ${
                    result.isMastered
                      ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                  }`}
                >
                  {accuracyPercent}% Accuracy
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div className="text-3xl sm:text-4xl font-black font-sans text-ink dark:text-white tracking-tight">
                  <span
                    className={
                      result.isMastered ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink'
                    }
                  >
                    {result.correctAnswers}
                  </span>
                  <span className="text-ink/40 font-bold mx-1.5">/</span>
                  <span>{result.totalQuestions}</span>
                  <span className="text-xs sm:text-sm font-bold text-text-secondary dark:text-muted-foreground ml-2">
                    {t('scoreSummary', {
                      correct: result.correctAnswers,
                      total: result.totalQuestions,
                    })}
                  </span>
                </div>
              </div>

              {/* Per-question verification indicators */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {Array.from({ length: result.totalQuestions }).map((_, i) => {
                  const isCorrectQuestion = i < result.correctAnswers;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-ink/20 text-[11px] font-bold ${
                        isCorrectQuestion
                          ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-surface-white text-ink/60 dark:bg-muted dark:text-muted-foreground'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${
                          isCorrectQuestion ? 'text-emerald-600 stroke-[3]' : 'opacity-30'
                        }`}
                      />
                      <span>Q{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="orange"
                size="lg"
                onClick={() => router.push(dashboardPath)}
                className="w-full sm:flex-1 h-12 min-h-[48px] cursor-pointer font-black text-sm shadow-card rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
              >
                <span>{t('returnToMap')}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
              {!result.isMastered && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={resetTest}
                  className="w-full sm:flex-1 h-12 min-h-[48px] cursor-pointer font-bold text-sm rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                  <span>{t('retryTest')}</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <TestSkeleton />;
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-6 text-center rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
          <p className="text-text-secondary font-medium">{error || t('emptyState')}</p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push(dashboardPath)}
              className="rounded-full border-2 border-ink font-bold"
            >
              {tCommon('backToHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-6 sm:py-10">
      <Card className="w-full max-w-xl rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href={dashboardPath}
              className="text-xs font-bold text-ink underline underline-offset-4 hover:opacity-80"
            >
              ← {tCommon('backToHome')}
            </Link>
            <Badge
              variant="outline"
              size="sm"
              className="font-bold text-xs bg-surface-yellow text-ink border-2 border-ink shadow-xs"
            >
              {t('hintFreeBadge')}
            </Badge>
          </div>

          <div>
            <CardTitle className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
              {t('title')}
            </CardTitle>
            {/* Clear 'mastery check' framing notice */}
            <div className="mt-3 rounded-xl border-2 border-ink bg-surface-cream/40 p-3.5 text-xs sm:text-sm text-ink leading-relaxed font-medium">
              {t('framingNotice')}
            </div>
          </div>

          {/* Question progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-text-secondary">
              <span aria-live="polite">{t('questionProgress', { current: currentIndex + 1 })}</span>
              <span className="font-mono text-ink font-bold">{progressPercent}%</span>
            </div>
            <div
              className="h-3.5 w-full overflow-hidden rounded-full border-2 border-ink bg-surface-peach/40"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary-orange rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Question Prompt */}
          <div className="rounded-tile border-2 border-ink bg-surface-cream/40 p-5 sm:p-6 shadow-xs">
            <div className="text-base sm:text-lg text-ink font-semibold leading-relaxed">
              <KatexRenderer content={currentQuestion.prompt} />
            </div>
          </div>

          {/* Options */}
          <div
            className="space-y-2.5"
            role="radiogroup"
            aria-label={t('questionProgress', { current: currentIndex + 1 })}
          >
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSubmitting}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border-2 border-ink px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'bg-surface-yellow shadow-xs text-ink font-bold ring-1 ring-ink'
                      : 'bg-surface-white hover:bg-surface-cream text-ink font-medium'
                  } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-ink text-xs font-bold ${
                        isSelected ? 'bg-primary-orange text-white' : 'bg-surface-cream text-ink'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <div className="text-sm sm:text-base font-normal">
                      <KatexRenderer content={opt.text} />
                    </div>
                  </div>
                  <span
                    className="text-xs text-text-secondary font-mono ml-2 hidden sm:inline"
                    aria-hidden="true"
                  >
                    [{idx + 1}]
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-4 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold space-y-3 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                  !
                </span>
                <span className="leading-snug">{error}</span>
              </div>
              {/guardian consent/i.test(error) && (
                <div className="pt-1">
                  <Link
                    href={`/consent?next=${encodeURIComponent(
                      typeof window !== 'undefined'
                        ? window.location.pathname + window.location.search
                        : '/test',
                    )}`}
                    className={buttonVariants({
                      variant: 'primary',
                      className: 'w-full min-h-[44px] inline-flex items-center justify-center',
                    })}
                  >
                    Complete Guardian Consent
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6">
          <Button
            type="button"
            variant="orange"
            size="lg"
            disabled={!selectedOption || isSubmitting}
            onClick={() => void handleConfirmAnswer()}
            className="w-full min-h-[48px] cursor-pointer text-base font-bold shadow-sm rounded-full border-2 border-ink hover:-translate-y-0.5 transition-transform"
          >
            {isSubmitting ? t('submitting') : t('submitAnswer')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function TestPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<TestSkeleton />}>
      <TestContent />
    </React.Suspense>
  );
}
