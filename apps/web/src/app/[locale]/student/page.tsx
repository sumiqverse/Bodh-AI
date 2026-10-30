'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
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
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { useSkillMap, type MasteryState, type SkillItem } from '@/hooks/useSkillMap';

export default function StudentHomePage(): React.JSX.Element {
  const t = useTranslations('skillMap');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const profileQuery = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: () => apiClient.getMyProfile(token || undefined),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const enrolledCurriculum =
    profileQuery.data?.profile?.curriculumCode ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('bodhai_student_curriculum') || 'NCERT-MATH-C8'
      : 'NCERT-MATH-C8');

  const { topics, skills, skillsByTopic, summary, nextAction, isLoading, error, refetch } =
    useSkillMap(enrolledCurriculum);

  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');

  const filteredSkills = React.useMemo(() => {
    if (selectedTopic === 'all') return skills;
    return skillsByTopic[selectedTopic] ?? [];
  }, [selectedTopic, skills, skillsByTopic]);

  const getMasteryBadge = (state: MasteryState) => {
    switch (state) {
      case 'mastered':
        return (
          <Badge
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-0.5 px-2.5"
          >
            {t('stateMastered')}
          </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="warning"
            size="sm"
            className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30 font-medium text-xs py-0.5 px-2.5"
          >
            {t('statePartial')}
          </Badge>
        );
      case 'not_learned':
      default:
        return (
          <Badge
            variant="outline"
            size="sm"
            className="text-muted-foreground border-border font-normal text-xs py-0.5 px-2.5"
          >
            {t('stateNotLearned')}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-semibold text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
            >
              My Profile
            </Button>
          </Link>
          <Link href="/diagnostic">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-medium cursor-pointer"
            >
              Diagnostic
            </Button>
          </Link>
          <Link href="/progress">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-medium cursor-pointer"
            >
              Progress
            </Button>
          </Link>
        </div>
      </div>

      {/* SINGLE CLEAR 'NEXT' ACTION CARD */}
      {nextAction && (
        <section
          aria-labelledby="next-action-heading"
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-8 shadow-card"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  size="sm"
                  className="font-semibold text-xs uppercase tracking-wider py-1 px-3"
                >
                  {t('nextActionBadge')}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {nextAction.skillCode}
                </span>
              </div>
              <h2
                id="next-action-heading"
                className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
              >
                {nextAction.skillName}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {nextAction.rationale}
              </p>
            </div>

            <div className="w-full md:w-auto shrink-0">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  if (nextAction.actionType === 'test') {
                    router.push(`/test?skillId=${nextAction.skillId}`);
                  } else if (nextAction.actionType === 'solve') {
                    router.push(`/solve?skillId=${nextAction.skillId}`);
                  } else {
                    router.push(`/learn?skillId=${nextAction.skillId}`);
                  }
                }}
                className="w-full md:w-auto min-h-[50px] px-8 text-base font-semibold shadow-elevated cursor-pointer"
              >
                {nextAction.actionType === 'test'
                  ? t('startTest')
                  : nextAction.actionType === 'solve'
                    ? t('startSolve')
                    : t('startLesson')}{' '}
                →
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Mastery States Summary Statistics */}
      <section
        aria-label="Mastery Status Summary"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            {t('totalSkills')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
            {summary.totalCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-emerald-500/20 bg-emerald-500/5">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            {t('masteredCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {summary.masteredCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-amber-500/20 bg-amber-500/5">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            {t('partialCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {summary.partialCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            {t('notLearnedCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-muted-foreground mt-1 block">
            {summary.notLearnedCount}
          </span>
        </Card>
      </section>

      {/* Topic Filter Pills */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        role="tablist"
        aria-label="Filter topics"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedTopic === 'all'}
          onClick={() => setSelectedTopic('all')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            selectedTopic === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('filterAll')} ({skills.length})
        </button>

        {topics.map((topic) => {
          const isSelected = selectedTopic === topic.code;
          const count = skillsByTopic[topic.code]?.length ?? 0;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedTopic(topic.code)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted'
              }`}
            >
              {topic.name} ({count})
            </button>
          );
        })}
      </div>

      {/* SKILL MAP GRID — SHOWING THE THREE MASTERY STATES */}
      <section aria-label="Curriculum Skills Map" className="space-y-4">
        {filteredSkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {t('emptyState')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSkills.map((skill: SkillItem) => (
              <Card
                key={skill.id}
                className="flex flex-col justify-between p-5 transition-all hover:border-primary/40 hover:shadow-card focus-within:ring-2 focus-within:ring-primary"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{skill.code}</span>
                    {getMasteryBadge(skill.state)}
                  </div>

                  <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                    {skill.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>{skill.topicName}</span>
                    <span>•</span>
                    <span>{t('attemptsLabel', { count: skill.attemptsCount })}</span>
                  </div>
                </div>

                {/* Direct Action Links for Mobile Touch Targets */}
                <div className="flex items-center gap-2 pt-5 border-t border-border/60 mt-4">
                  <Link href={`/learn?skillId=${skill.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full min-h-[42px] text-xs font-medium cursor-pointer"
                    >
                      {t('startLesson')}
                    </Button>
                  </Link>

                  <Link href={`/solve?skillId=${skill.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full min-h-[42px] text-xs font-semibold cursor-pointer"
                    >
                      {t('startSolve')}
                    </Button>
                  </Link>

                  <Link
                    href={`/test?skillId=${skill.id}`}
                    className="shrink-0"
                    title={t('startTest')}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[42px] px-3 text-xs font-medium cursor-pointer text-emerald-700 dark:text-emerald-400 hover:border-emerald-500"
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
