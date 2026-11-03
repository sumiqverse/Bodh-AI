'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  Badge,
  Skeleton,
} from '@bodhai/ui';
import { useTest } from '@/hooks/useTest';
import { KatexRenderer } from '@/components/katex-renderer';

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

  // Clear choice on question advance
  React.useEffect(() => {
    setSelectedOption(null);
  }, [currentIndex]);

  const handleConfirmAnswer = async (): Promise<void> => {
    if (!selectedOption || isSubmitting) return;
    await submitAnswer(selectedOption);
  };

  // Completed Test State — Clear 'mastery check' framing & outcome
  if (isCompleted && result) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg rounded-card border-2 border-ink bg-surface-white dark:bg-card text-center shadow-card">
          <CardHeader className="pb-4">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black border-2 border-ink shadow-sm ${
                result.isMastered ? 'bg-emerald-100 text-emerald-950' : 'bg-surface-cream text-ink'
              }`}
            >
              {result.isMastered ? '🏆' : '✓'}
            </div>

            <Badge
              variant={result.isMastered ? 'default' : 'outline'}
              size="sm"
              className="mx-auto mb-2 font-bold border-2 border-ink"
            >
              {result.isMastered ? 'Mastery Verified' : 'Practice Progress'}
            </Badge>

            <CardTitle className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
              {t('testCompletedTitle')}
            </CardTitle>

            <CardDescription className="text-sm text-text-secondary mt-2 leading-relaxed">
              {result.isMastered ? t('masteredCongratulations') : t('needsPracticeAdvice')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <div className="rounded-xl border-2 border-ink bg-surface-cream/50 p-5 space-y-1 shadow-xs">
              <span className="text-xs uppercase font-extrabold text-text-secondary tracking-wider">
                Assessment Outcome
              </span>
              <p className="font-serif text-2xl font-black text-ink">
                {t('scoreSummary', {
                  correct: result.correctAnswers,
                  total: result.totalQuestions,
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="orange"
                size="lg"
                onClick={() => router.push('/student')}
                className="w-full sm:flex-1 min-h-[48px] cursor-pointer font-bold shadow-sm rounded-full border-2 border-ink hover:-translate-y-0.5 transition-transform"
              >
                {t('returnToMap')}
              </Button>
              {!result.isMastered && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={resetTest}
                  className="w-full sm:flex-1 min-h-[48px] cursor-pointer font-bold rounded-full border-2 border-ink"
                >
                  {t('retryTest')}
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
              onClick={() => router.push('/student')}
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
              href="/student"
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
              className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3.5 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold flex items-center gap-2.5 shadow-xs"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                !
              </span>
              <span className="leading-snug">{error}</span>
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
