'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@bodhai/ui';
import type { ClassGapClustersResponse, GapClusterItem } from '@bodhai/api-client';

interface GroupGapClustersViewProps {
  readonly clusters: ClassGapClustersResponse;
  readonly onAssignRevision: (cluster: GapClusterItem) => void;
  readonly assigningClusterId?: string | null;
}

export function GroupGapClustersView({
  clusters,
  onAssignRevision,
  assigningClusterId,
}: GroupGapClustersViewProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.clusters');

  if (clusters.clusters.length === 0) {
    return (
      <Card className="border-dashed p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          ✓
        </div>
        <h3 className="mt-4 font-semibold text-lg text-foreground">{t('emptyTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t('emptyDesc')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {clusters.clusters.map((cluster) => {
          const isAssigning = assigningClusterId === cluster.cluster_id;
          const avgPct = Math.round(cluster.average_p_mastery * 100);
          const plan = cluster.suggested_revision_plan;

          return (
            <Card
              key={cluster.cluster_id}
              className="border-amber-200/80 dark:border-amber-900/50 shadow-xs hover:border-amber-400/80 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                      >
                        {cluster.topic_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {cluster.skill_code}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {t('studentsSharingGap', {
                        count: cluster.student_ids.length,
                        skill: cluster.skill_name,
                      })}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {t('averageMastery')}:{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                        {avgPct}%
                      </strong>
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    disabled={isAssigning}
                    onClick={() => onAssignRevision(cluster)}
                  >
                    {isAssigning ? t('assigning') : t('assignRevisionToGroup')}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Students with gap */}
                <div className="rounded-md bg-muted/40 p-3 border border-border">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                    <span>Identified Students ({cluster.student_ids.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.student_names.map((name, idx) => (
                      <span
                        key={cluster.student_ids[idx] || idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-background border border-border text-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Revision Plan */}
                {plan && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {t('suggestedRevisionPlan')}
                      </span>
                      <Badge variant="outline" className="text-xs font-medium">
                        {t('recommendedDuration', { mins: plan.recommended_duration_mins })}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{plan.strategy}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Focus Competency:{' '}
                        <span className="font-medium text-foreground">{plan.focus_skill}</span>
                      </p>
                    </div>

                    {plan.suggested_actions && plan.suggested_actions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Scaffolded Steps:
                        </span>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-foreground/90 pl-1">
                          {plan.suggested_actions.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
