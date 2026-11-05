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
  buttonVariants,
  Badge,
  Skeleton,
} from '@bodhai/ui';
import { useSolve, solveSubmissionSchema, type SolveSubmissionFormValues } from '@/hooks/useSolve';
import { KatexRenderer } from '@/components/katex-renderer';
import { isGuardianConsentError } from '@/lib/api-errors';
import { getCurrentUser } from '@/lib/api-client';
import { Check, Info, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    isPracticeCompleted,
    completedSkillId,
    error,
    submitAnswer,
    resetForNextQuestion,
  } = useSolve({ skillId, questionId });

  const [redirectCountdown, setRedirectCountdown] = React.useState<number>(5);
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

  React.useEffect(() => {
    if (!isPracticeCompleted) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(dashboardPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPracticeCompleted, router, dashboardPath]);

  const form = useForm<SolveSubmissionFormValues>({
    resolver: zodResolver(solveSubmissionSchema),
    defaultValues: {
      selectedAnswer: '',
    },
  });

  const selectedAnswer = form.watch('selectedAnswer');

  const onSubmit = async (values: SolveSubmissionFormValues): Promise<void> => {
    if (isSubmitting || hasSubmitted) return;
    try {
      await submitAnswer(values.selectedAnswer);
    } catch {
      // Handled in submitMutation
    }
  };

  const handleNextProblem = (): void => {
    form.reset({ selectedAnswer: '' });
    if (searchParams.has('questionId')) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('questionId');
      const qs = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/solve${qs}`);
    }
    resetForNextQuestion();
  };

  if (error) {
    const consentRequired = isGuardianConsentError(error);
    const returnToPractice = `/solve?${searchParams.toString()}`;
    const consentPath = `/consent?next=${encodeURIComponent(returnToPractice)}`;

    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Card className={`p-6 ${consentRequired ? 'border-primary/30' : 'border-destructive/30'}`}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              {consentRequired ? t('consentRequiredTitle') : t('emptyState')}
            </CardTitle>
            <CardDescription
              className={`text-sm mt-1 ${
                consentRequired ? 'text-muted-foreground' : 'text-destructive'
              }`}
            >
              {consentRequired ? t('consentRequiredDescription') : error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className={consentRequired ? 'space-y-3' : undefined}>
            {consentRequired ? (
              <>
                <Link
                  href={consentPath}
                  className={buttonVariants({
                    variant: 'primary',
                    className: 'w-full min-h-[44px] inline-flex items-center justify-center',
                  })}
                >
                  {t('completeConsentButton')}
                </Link>
                <Link
                  href={dashboardPath}
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full min-h-[44px] inline-flex items-center justify-center',
                  })}
                >
                  {tCommon('backToHome')}
                </Link>
              </>
            ) : (
              <Link
                href={dashboardPath}
                className={buttonVariants({
                  variant: 'primary',
                  className: 'w-full min-h-[44px] inline-flex items-center justify-center',
                })}
              >
                {tCommon('backToHome')}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPracticeCompleted) {
    const targetTestSkillId = skillId || completedSkillId;
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card text-center p-6 sm:p-8 space-y-6">
          <div className="w-16 h-16 rounded-full border-2 border-ink bg-accent-green/20 text-accent-green flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-ink dark:text-white">
              {t('practiceCompletedTitle')}
            </h2>
            <p className="text-sm sm:text-base text-ink/80 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
              {t('practiceCompletedSubtitle')}
            </p>
          </div>

          <div className="rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-xs font-mono font-bold text-ink inline-flex items-center gap-2 mx-auto shadow-xs">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span>{t('redirectingMessage', { count: redirectCountdown })}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="orange"
              size="md"
              onClick={() =>
                router.push(targetTestSkillId ? `/test?skillId=${targetTestSkillId}` : '/test')
              }
              className="flex-1 min-h-[48px] cursor-pointer font-black text-sm shadow-card rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
            >
              <span>{t('readyForTestButton')}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => router.push(dashboardPath)}
              className="flex-1 min-h-[48px] cursor-pointer font-bold text-sm rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
            >
              <span>{t('doneDashboardButton')}</span>
            </Button>
          </div>
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
    <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-8">
      {/* Navigation header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <Link
          href={dashboardPath}
          className="text-xs font-bold text-ink underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1"
        >
          ← {tCommon('backToHome')}
        </Link>
        <span className="text-xs font-mono font-bold text-ink bg-surface-cream px-2.5 py-1 rounded-full border border-ink shadow-xs">
          {question.code}
        </span>
      </div>

      <Card className="w-full max-w-2xl rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
        <CardHeader className="pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="default" size="sm" className="font-bold text-xs border-2 border-ink">
              {t('title')}
            </Badge>
            <span className="text-xs text-text-secondary font-mono font-bold">
              Difficulty: Tier {question.difficulty}
            </span>
          </div>

          <CardTitle className="font-serif text-xl sm:text-2xl font-black text-ink dark:text-white">
            {t('subtitle')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Question Prompt with KaTeX */}
          <div className="rounded-tile border-2 border-ink bg-surface-cream/40 p-5 sm:p-6 shadow-xs">
            <div className="text-base sm:text-lg font-semibold text-ink leading-relaxed">
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
                    className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border-2 border-ink px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? 'bg-surface-yellow shadow-xs font-bold text-ink ring-1 ring-ink'
                        : 'bg-surface-white hover:bg-surface-cream text-ink font-medium'
                    } ${isSubmitting || hasSubmitted ? 'cursor-default' : ''}`}
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

            {form.formState.errors.selectedAnswer && !hasSubmitted && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {t('selectOptionRequired')}
              </p>
            )}

            {/* Hint Ladder with 3 Progressive Levels */}
            <div className="rounded-tile border-2 border-ink bg-surface-cream/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-ink">
                  {t('hintLadderTitle')}
                </span>
                <span className="text-xs font-mono font-bold text-ink">
                  {hintLevel}/{maxHints}
                </span>
              </div>

              {/* Revealed Hints */}
              {activeHints.length > 0 && (
                <div className="space-y-2 pt-1" aria-live="polite">
                  {activeHints.map((hintText, i) => (
                    <div
                      key={i}
                      className="rounded-xl border-2 border-ink bg-surface-white p-3 text-xs sm:text-sm text-ink leading-relaxed font-medium shadow-xs"
                    >
                      <span className="font-bold text-primary-orange mr-1.5">Hint {i + 1}:</span>
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
                  className="w-full min-h-[42px] cursor-pointer text-xs font-bold rounded-full border-2 border-ink hover:bg-surface-yellow"
                >
                  💡 {t('requestHintButton', { level: hintLevel + 1 })}
                </Button>
              )}

              {hintLevel >= maxHints && (
                <p className="text-center text-xs text-text-secondary font-bold pt-1">
                  {t('allHintsUsed')}
                </p>
              )}
            </div>

            {!hasSubmitted && (
              <Button
                type="submit"
                variant="orange"
                size="lg"
                disabled={isSubmitting || !selectedAnswer}
                className="w-full min-h-[48px] cursor-pointer text-base font-bold shadow-sm rounded-full border-2 border-ink hover:-translate-y-0.5 transition-transform"
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
              className={`rounded-card border-2 border-ink p-5 sm:p-6 space-y-4 shadow-card animate-in fade-in duration-300 ${
                submissionResult.is_correct ? 'bg-emerald-100' : 'bg-surface-pink/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold border-2 border-ink ${
                    submissionResult.is_correct
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface-yellow text-ink'
                  }`}
                  aria-hidden="true"
                >
                  {submissionResult.is_correct ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <Info className="w-4 h-4 stroke-[2.5]" />
                  )}
                </span>
                <h3
                  id="feedback-heading"
                  className="font-serif text-lg sm:text-xl font-bold text-ink"
                >
                  {submissionResult.is_correct ? t('calmCorrectTitle') : t('calmIncorrectTitle')}
                </h3>
              </div>

              {/* Pedagogical Step-by-Step Explanation */}
              <div className="rounded-xl border-2 border-ink bg-surface-white p-4 space-y-2 shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-secondary">
                  {t('explanationHeading')}
                </h4>
                <div className="text-sm sm:text-base text-ink leading-relaxed font-medium">
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
                  className="flex-1 min-h-[48px] cursor-pointer font-bold text-sm rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
                >
                  <span>{t('nextQuestionButton')}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Button>
                <Button
                  type="button"
                  variant="orange"
                  size="md"
                  onClick={() => router.push(`/test?skillId=${question.skillId}`)}
                  className="flex-1 min-h-[48px] cursor-pointer font-black text-sm shadow-card rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-2"
                >
                  <span>{t('readyForTestButton')}</span>
                  <span aria-hidden="true">→</span>
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
