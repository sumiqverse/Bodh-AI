'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
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
import { useLearn } from '@/hooks/useLearn';
import { KatexRenderer } from '@/components/katex-renderer';

function LearnSkeleton(): React.JSX.Element {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function LearnContent(): React.JSX.Element {
  const t = useTranslations('learn');
  const locale = useLocale();
  const currentLang = (locale === 'hi' ? 'hi' : 'en') as 'en' | 'hi';
  const searchParams = useSearchParams();
  const router = useRouter();

  const skillId = searchParams.get('skillId') ?? 'default';

  const { lesson, depth, setDepth, setLanguage, isLoading, error } = useLearn({
    skillId,
    initialDepth: 'standard',
    initialLanguage: currentLang,
  });

  React.useEffect(() => {
    setLanguage(currentLang);
  }, [currentLang, setLanguage]);

  if (isLoading || !lesson) {
    return <LearnSkeleton />;
  }

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
            <Link
              href="/student"
              className={buttonVariants({
                variant: 'primary',
                className: 'w-full min-h-[44px] inline-flex items-center justify-center',
              })}
            >
              {t('backToMap')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-10 space-y-8">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/student"
            className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1 mb-2"
          >
            ← {t('backToMap')}
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {lesson.skillName}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {lesson.topicName} • <span className="font-mono">{lesson.skillCode}</span>
          </p>
        </div>

        {/* Explanation Depth Selector */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border max-w-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDepth('standard')}
            className={`flex-1 rounded-lg py-2 px-3 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
              depth === 'standard'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('depthStandard')}
          </button>
          <button
            type="button"
            onClick={() => setDepth('deep')}
            className={`flex-1 rounded-lg py-2 px-3 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
              depth === 'deep'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('depthDeep')}
          </button>
        </div>
      </div>

      {/* Core Conceptual Explanation Card */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-3">
          <Badge variant="default" size="sm" className="w-fit mb-2 font-semibold text-xs">
            {depth === 'deep' ? t('depthDeep') : t('depthStandard')}
          </Badge>
          <CardTitle className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Overview text with KaTeX */}
          <div className="text-base sm:text-lg leading-relaxed text-foreground font-serif">
            <KatexRenderer content={lesson.overview} />
          </div>

          {/* Deep dive sections if selected */}
          {depth === 'deep' && lesson.deepDive.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/60">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Detailed Principles
              </h3>
              <ul className="space-y-2.5 text-sm sm:text-base text-foreground leading-relaxed list-disc list-inside">
                {lesson.deepDive.map((point, index) => (
                  <li key={index} className="pl-1">
                    <KatexRenderer content={point} className="inline" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Formulas Section */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t('keyFormulas')}
            </h3>
            <div className="space-y-2 text-sm sm:text-base text-foreground font-serif">
              {lesson.keyFormulas.map((formula, i) => (
                <div key={i} className="py-1">
                  <KatexRenderer content={formula} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WORKED EXAMPLE SECTION */}
      <section aria-labelledby="worked-example-heading" className="space-y-4">
        <Card className="shadow-card border-border/80">
          <CardHeader className="pb-3">
            <Badge variant="outline" size="sm" className="w-fit mb-1 text-xs font-semibold">
              NCERT Step-by-Step
            </Badge>
            <CardTitle
              id="worked-example-heading"
              className="font-serif text-xl sm:text-2xl font-bold text-foreground"
            >
              {lesson.workedExample.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Problem Statement */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Problem
              </span>
              <div className="text-base sm:text-lg font-medium text-foreground">
                <KatexRenderer content={lesson.workedExample.problem} />
              </div>
            </div>

            {/* Step-by-Step Resolution */}
            <div className="space-y-4">
              {lesson.workedExample.steps.map((st) => (
                <div
                  key={st.stepNumber}
                  className="rounded-xl border border-border/70 p-4 bg-card/60 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {st.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('stepLabel', { number: st.stepNumber })}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed">
                    {st.explanation}
                  </p>
                  <div className="rounded-lg bg-muted/30 p-2.5 font-serif text-sm sm:text-base">
                    <KatexRenderer content={st.math} />
                  </div>
                </div>
              ))}
            </div>

            {/* Final Solution & Takeaway */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                {t('solutionLabel')}
              </span>
              <div className="text-base font-bold text-foreground">
                <KatexRenderer content={lesson.workedExample.solution} />
              </div>
              <p className="text-xs sm:text-sm text-emerald-900/80 dark:text-emerald-200/80 pt-1">
                <span className="font-semibold">{t('takeawayLabel')}:</span>{' '}
                {lesson.workedExample.keyTakeaway}
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => router.push(`/solve?skillId=${skillId}`)}
              className="w-full sm:flex-1 min-h-[48px] cursor-pointer text-base font-semibold shadow-elevated"
            >
              {t('readyToSolve')} →
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

export default function LearnPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<LearnSkeleton />}>
      <LearnContent />
    </React.Suspense>
  );
}
