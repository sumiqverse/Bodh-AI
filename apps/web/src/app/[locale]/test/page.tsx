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
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col items-center justify-center px-4 py-8">
        <Card className="w-full shadow-floating text-center border-border/80">
          <CardHeader className="pb-4">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
                result.isMastered
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {result.isMastered ? '🏆' : '✓'}
            </div>

            <Badge
              variant={result.isMastered ? 'default' : 'outline'}
              size="sm"
              className="mx-auto mb-2 font-semibold"
            >
              {result.isMastered ? 'Mastery Verified' : 'Practice Progress'}
            </Badge>

            <CardTitle className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('testCompletedTitle')}
            </CardTitle>

            <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {result.isMastered ? t('masteredCongratulations') : t('needsPracticeAdvice')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-1">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Assessment Outcome
              </span>
              <p className="font-serif text-2xl font-extrabold text-foreground">
                {t('scoreSummary', {
                  correct: result.correctAnswers,
                  total: result.totalQuestions,
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => router.push('/student')}
                className="w-full sm:flex-1 min-h-[48px] cursor-pointer font-semibold shadow-elevated"
              >
                {t('returnToMap')}
              </Button>
              {!result.isMastered && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={resetTest}
                  className="w-full sm:flex-1 min-h-[48px] cursor-pointer font-semibold"
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
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center px-4 py-8">
        <Card className="w-full p-6 text-center shadow-floating border-border/80">
          <p className="text-muted-foreground">{error || t('emptyState')}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => router.push('/student')}>
              {tCommon('backToHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-4 py-6 sm:py-10">
      <Card className="w-full shadow-floating border-border/80">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href="/student"
              className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
            >
              ← {tCommon('backToHome')}
            </Link>
            <Badge
              variant="outline"
              size="sm"
              className="font-semibold text-xs text-amber-700 dark:text-amber-400 border-amber-500/30"
            >
              {t('hintFreeBadge')}
            </Badge>
          </div>

          <div>
            <CardTitle className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('title')}
            </CardTitle>
            {/* Clear 'mastery check' framing notice */}
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs sm:text-sm text-foreground leading-relaxed">
              {t('framingNotice')}
            </div>
          </div>

          {/* Question progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span aria-live="polite">{t('questionProgress', { current: currentIndex + 1 })}</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Question Prompt */}
          <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 shadow-xs">
            <div className="text-base sm:text-lg text-foreground font-medium leading-relaxed">
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
                  className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary font-semibold text-foreground'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 text-foreground'
                  } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <div className="text-sm sm:text-base font-normal">
                      <KatexRenderer content={opt.text} />
                    </div>
                  </div>
                  <span
                    className="text-xs text-muted-foreground font-mono ml-2 hidden sm:inline"
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
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6">
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!selectedOption || isSubmitting}
            onClick={() => void handleConfirmAnswer()}
            className="w-full min-h-[48px] cursor-pointer text-base font-semibold shadow-elevated"
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
