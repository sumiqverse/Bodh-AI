'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useSolve, solveSubmissionSchema, type SolveSubmissionFormValues } from '@/hooks/useSolve';
import { KatexRenderer } from '@/components/katex-renderer';

function SolveSkeleton(): React.JSX.Element {
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

function SolveContent(): React.JSX.Element {
  const t = useTranslations('solve');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();

  const skillId = searchParams.get('skillId') ?? undefined;
  const questionId = searchParams.get('questionId') ?? undefined;

  const {
    question,
    hintLevel,
    activeHints,
    maxHints,
    requestHint,
    isSubmitting,
    submissionResult,
    hasSubmitted,
    error,
    submitAnswer,
    resetForNextQuestion,
  } = useSolve({ skillId, questionId });

  const form = useForm<SolveSubmissionFormValues>({
    resolver: zodResolver(solveSubmissionSchema),
    defaultValues: {
      selectedAnswer: '',
    },
  });

  const selectedAnswer = form.watch('selectedAnswer');

  const onSubmit = async (values: SolveSubmissionFormValues): Promise<void> => {
    if (isSubmitting || hasSubmitted) return;
    await submitAnswer(values.selectedAnswer);
  };

  const handleNextProblem = (): void => {
    form.reset({ selectedAnswer: '' });
    resetForNextQuestion();
  };

  if (error) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold">{t('emptyState')}</CardTitle>
            <CardDescription className="text-sm text-destructive mt-1">
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student">
              <Button variant="primary" className="w-full min-h-[44px]">
                {tCommon('backToHome')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-8">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1"
        >
          ← {tCommon('backToHome')}
        </Link>
        <span className="text-xs font-mono text-muted-foreground">{question.code}</span>
      </div>

      <Card className="shadow-floating border-border/80">
        <CardHeader className="pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="default" size="sm" className="font-semibold text-xs">
              {t('title')}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Difficulty: Tier {question.difficulty}
            </span>
          </div>

          <CardTitle className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            {t('subtitle')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Question Prompt with KaTeX */}
          <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 shadow-xs">
            <div className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
              <KatexRenderer content={question.prompt} />
            </div>
          </div>

          {/* Form with React Hook Form + Zod */}
          <form id="solve-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div role="radiogroup" aria-label={t('selectOptionRequired')} className="space-y-2.5">
              {question.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isSubmitting || hasSubmitted}
                    onClick={() =>
                      form.setValue('selectedAnswer', opt.id, { shouldValidate: true })
                    }
                    className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary font-semibold text-foreground'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 text-foreground'
                    } ${isSubmitting || hasSubmitted ? 'cursor-default' : ''}`}
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

            {form.formState.errors.selectedAnswer && !hasSubmitted && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {t('selectOptionRequired')}
              </p>
            )}

            {/* Hint Ladder with 3 Progressive Levels */}
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('hintLadderTitle')}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {hintLevel}/{maxHints}
                </span>
              </div>

              {/* Revealed Hints */}
              {activeHints.length > 0 && (
                <div className="space-y-2 pt-1" aria-live="polite">
                  {activeHints.map((hintText, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs sm:text-sm text-foreground leading-relaxed"
                    >
                      <span className="font-bold text-primary mr-1.5">Hint {i + 1}:</span>
                      <KatexRenderer content={hintText} className="inline" />
                    </div>
                  ))}
                </div>
              )}

              {/* Request Next Hint Button */}
              {!hasSubmitted && hintLevel < maxHints && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={requestHint}
                  className="w-full min-h-[42px] cursor-pointer text-xs font-semibold hover:border-primary"
                >
                  💡 {t('requestHintButton', { level: hintLevel + 1 })}
                </Button>
              )}

              {hintLevel >= maxHints && (
                <p className="text-center text-xs text-muted-foreground font-medium pt-1">
                  {t('allHintsUsed')}
                </p>
              )}
            </div>

            {!hasSubmitted && (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !selectedAnswer}
                className="w-full min-h-[48px] cursor-pointer text-base font-semibold shadow-elevated"
              >
                {isSubmitting ? t('submittingButton') : t('submitButton')}
              </Button>
            )}
          </form>

          {/* IMMEDIATE FEEDBACK & STEP-BY-STEP EXPLANATION (Calm Tone, Zero Shaming) */}
          {hasSubmitted && submissionResult && (
            <section
              aria-live="polite"
              aria-labelledby="feedback-heading"
              className={`rounded-2xl border p-5 sm:p-6 space-y-4 shadow-sm animate-in fade-in duration-300 ${
                submissionResult.is_correct
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    submissionResult.is_correct
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}
                  aria-hidden="true"
                >
                  {submissionResult.is_correct ? '✓' : 'ℹ'}
                </span>
                <h3
                  id="feedback-heading"
                  className={`font-serif text-lg sm:text-xl font-bold ${
                    submissionResult.is_correct
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-amber-900 dark:text-amber-100'
                  }`}
                >
                  {submissionResult.is_correct ? t('calmCorrectTitle') : t('calmIncorrectTitle')}
                </h3>
              </div>

              {/* Pedagogical Step-by-Step Explanation */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('explanationHeading')}
                </h4>
                <div className="text-sm sm:text-base text-foreground leading-relaxed">
                  <KatexRenderer content={submissionResult.explanation} />
                </div>
              </div>

              {/* Action buttons following feedback */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleNextProblem}
                  className="flex-1 min-h-[46px] cursor-pointer font-semibold"
                >
                  {t('nextQuestionButton')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => router.push(`/test?skillId=${question.skillId}`)}
                  className="flex-1 min-h-[46px] cursor-pointer font-semibold shadow-elevated"
                >
                  {t('readyForTestButton')} →
                </Button>
              </div>
            </section>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-4 text-center">
          <span className="mx-auto text-[11px] text-muted-foreground">
            {t('idempotencyNotice')}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SolvePage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<SolveSkeleton />}>
      <SolveContent />
    </React.Suspense>
  );
}
