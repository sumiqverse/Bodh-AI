'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@bodhai/ui';
import type { ClassProgressSummaryResponse } from '@bodhai/api-client';

interface ProgressReassessmentViewProps {
  readonly progress: ClassProgressSummaryResponse;
}

export function ProgressReassessmentView({
  progress,
}: ProgressReassessmentViewProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.progressView');

  const masteryPct = Math.round(progress.overall_mastery_pct);
  const growthPct =
    progress.reassessment_growth_pct == null ? null : Math.round(progress.reassessment_growth_pct);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Longitudinal learning curves, reassessment growth, and competency distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('overallMastery')}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">{masteryPct}%</span>
              <span className="text-xs text-muted-foreground">
                of all student–skill pairs mastered
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, masteryPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('averageSkillsMastered')}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {progress.mastered_skills_avg.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">skills / student</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Across enrolled curriculum competencies
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('growthRate')}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary">
                {growthPct === null ? 'Not available' : `+${growthPct}%`}
              </span>
              <Badge
                variant="outline"
                className="text-xs bg-primary/10 text-primary border-primary/20"
              >
                Post-Intervention
              </Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Relative growth from diagnostic baseline
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('totalAttempts')}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">
                {progress.total_attempts.toLocaleString()}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total practice & test item attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Longitudinal Progression Timeline */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            {t('longitudinalTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            Pedagogical progression phases from initial diagnostic to current competency
            reassessment.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1: Baseline Diagnostic */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phase 1
                </span>
                <Badge variant="outline" className="text-xs">
                  Baseline
                </Badge>
              </div>
              <h4 className="font-semibold text-sm text-foreground">Diagnostic Assessment</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Initial adaptive placement tests identifying foundational prerequisite gaps and
                establishing initial Bayesian knowledge states.
              </p>
              <div className="pt-2 text-xs font-mono text-muted-foreground">
                Initial benchmark established
              </div>
            </div>

            {/* Phase 2: Intervention */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Phase 2
                </span>
                <Badge
                  variant="outline"
                  className="text-xs bg-primary/10 text-primary border-primary/20"
                >
                  Targeted
                </Badge>
              </div>
              <h4 className="font-semibold text-sm text-foreground">Scaffolded Intervention</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adaptive practice ladders with 3-level hints, targeted group-gap assignments, and
                teacher-guided instruction.
              </p>
              <div className="pt-2 text-xs font-mono text-primary font-semibold">
                Active learning cycles & practice
              </div>
            </div>

            {/* Phase 3: Reassessment */}
            <div className="rounded-lg border border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Phase 3
                </span>
                <Badge variant="success" className="text-xs">
                  Reassessment
                </Badge>
              </div>
              <h4 className="font-semibold text-sm text-foreground">Competency Verification</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Independent hint-free mastery checks verifying sustained retention and skill
                consolidation without regression.
              </p>
              <div className="pt-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                {growthPct === null
                  ? 'Reassessment data is not available yet'
                  : `+${growthPct}% net measured competency growth`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
