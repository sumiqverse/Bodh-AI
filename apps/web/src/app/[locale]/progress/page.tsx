'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@bodhai/ui';
import { useProgressHistory, type ProgressHistoryItem } from '@/hooks/useProgressHistory';

export default function ProgressPage(): React.JSX.Element {
  const t = useTranslations('progress');
  const tCommon = useTranslations('common');

  const { historyItems, stats, isLoading, error, refetch } = useProgressHistory('NCERT-MATH-C8');

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-80" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Error Loading History</CardTitle>
            <CardDescription className="text-sm text-destructive mt-1">
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="primary"
              onClick={refetch}
              className="w-full min-h-[44px] cursor-pointer"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/student"
            className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1 mb-2"
          >
            ← {tCommon('backToHome')}
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">{t('subtitle')}</p>
        </div>

        <Link href="/student">
          <Button variant="primary" size="sm" className="min-h-[42px] px-4 font-semibold shadow-xs">
            {t('startPracticing')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <section
        aria-label="Progress Statistics"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <Card className="p-4 shadow-xs text-center border-emerald-500/20 bg-emerald-500/5">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
            {t('statMastered')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {stats.masteredSkills}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-amber-500/20 bg-amber-500/5">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
            {t('statPartial')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {stats.partialSkills}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
            {t('statNotLearned')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-muted-foreground mt-1 block">
            {stats.notLearnedSkills}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
            {t('statAccuracy')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
            {stats.overallAccuracy}%
          </span>
        </Card>
      </section>

      {/* Progress Timeline List */}
      <section aria-label={t('historyHeading')} className="space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t('historyHeading')}
        </h2>

        {historyItems.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border/80">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl">
              📊
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">{t('emptyTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{t('emptyDesc')}</p>
            <div className="mt-6">
              <Link href="/diagnostic">
                <Button variant="primary" size="md" className="min-h-[44px] font-semibold">
                  Take Diagnostic Test
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {historyItems.map((item: ProgressHistoryItem) => (
              <Card
                key={item.skillId}
                className="p-4 sm:p-5 transition-all hover:border-primary/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base sm:text-lg font-bold text-foreground">
                      {item.skillName}
                    </span>
                    <Badge
                      variant={
                        item.state === 'mastered'
                          ? 'success'
                          : item.state === 'partial'
                            ? 'warning'
                            : 'outline'
                      }
                      size="sm"
                      className="text-xs"
                    >
                      {item.state === 'mastered'
                        ? 'Mastered'
                        : item.state === 'partial'
                          ? 'In Progress'
                          : 'Not Started'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.topicName} • Accuracy: {item.accuracyPercentage}% ({item.correctCount}/
                    {item.attemptsCount} attempts)
                  </p>
                  {item.rationale && (
                    <p className="text-xs text-muted-foreground italic pt-0.5">{item.rationale}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link href={`/solve?skillId=${item.skillId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[38px] text-xs font-semibold cursor-pointer"
                    >
                      Practice
                    </Button>
                  </Link>
                  <Link href={`/test?skillId=${item.skillId}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="min-h-[38px] text-xs font-semibold cursor-pointer"
                    >
                      Test
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
