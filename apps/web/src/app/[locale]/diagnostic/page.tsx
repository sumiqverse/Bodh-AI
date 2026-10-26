'use client';

import * as React from 'react';
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
import { useDiagnostic } from '@/hooks/useDiagnostic';
import { KatexRenderer } from '@/components/katex-renderer';

export default function DiagnosticPage(): React.JSX.Element {
  const t = useTranslations('diagnostic');
  const router = useRouter();

  const {
    currentItem,
    questionNumber,
    totalQuestions,
    isCompleted,
    isLoading,
    isSubmitting,
    errorMessage,
    submitAnswer,
    retry,
  } = useDiagnostic({ totalTarget: 15 });

  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [startTime, setStartTime] = React.useState<number>(Date.now());

  // Reset timer on question change
  React.useEffect(() => {
    setStartTime(Date.now());
    setSelectedOption(null);
  }, [currentItem?.question_id]);

  const handleSelectOption = (optId: string): void => {
    if (isSubmitting) return;
    setSelectedOption(optId);
  };

  const handleConfirmNext = async (): Promise<void> => {
    if (!selectedOption || isSubmitting) return;
    const elapsed = Math.max(1000, Date.now() - startTime);
    await submitAnswer(selectedOption, elapsed);
  };

  // Keyboard navigation: 1-4 for options, Enter to submit
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [currentItem?.options, isSubmitting, selectedOption]);

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

  // Error state with retry for slow or dropped connections
  if (errorMessage && !currentItem) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center px-4 py-8">
        <Card className="w-full text-center p-6 border-destructive/30">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              ⚠️
            </div>
            <CardTitle className="text-xl font-bold">{t('emptyState')}</CardTitle>
            <CardDescription className="text-sm text-destructive font-medium mt-2">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={retry}
              className="w-full min-h-[44px] cursor-pointer"
            >
              {t('retryButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed Diagnostic state — Calm tone, NO scores mid-test, clear next step
  if (isCompleted) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col items-center justify-center px-4 py-8">
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

          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
              {t('hintFreeNotice')}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => router.push('/student')}
                className="w-full min-h-[48px] cursor-pointer font-semibold shadow-elevated"
              >
                {t('viewSkillMap')}
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
            <Badge variant="outline" size="sm" className="font-normal text-xs">
              {t('hintFreeNotice')}
            </Badge>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              {currentItem?.code || 'NCERT Class 8'}
            </span>
            <div className="text-base sm:text-lg text-foreground font-medium leading-relaxed">
              <KatexRenderer content={currentItem?.prompt || ''} />
            </div>
          </div>

          {/* Options List */}
          <div className="space-y-2.5" role="radiogroup" aria-label={t('selectOptionPrompt')}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('selectOptionPrompt')}
            </p>

            {currentItem?.options?.map((opt, idx) => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSubmitting}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary text-foreground font-semibold'
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

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive font-medium"
            >
              {errorMessage}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6">
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
        </CardFooter>
      </Card>
    </div>
  );
}
