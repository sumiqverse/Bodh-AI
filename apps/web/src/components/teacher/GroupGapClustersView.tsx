'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@bodhai/ui';
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
      <div className="rounded-card border-2 border-dashed border-ink p-10 text-center bg-surface-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-cream border-2 border-ink text-2xl font-black shadow-xs">
          ✓
        </div>
        <h3 className="mt-4 font-black text-lg text-ink">{t('emptyTitle')}</h3>
        <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">{t('emptyDesc')}</p>
      </div>
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
            <div
              key={cluster.cluster_id}
              className="rounded-card border-2 border-ink bg-surface-white dark:bg-card p-5 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-cream px-3 py-0.5 text-ink shadow-xs">
                        {cluster.topic_name}
                      </span>
                      <span className="text-xs text-text-secondary font-mono font-bold">
                        {cluster.skill_code}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-ink dark:text-white">
                      {t('studentsSharingGap', {
                        count: cluster.student_ids.length,
                        skill: cluster.skill_name,
                      })}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {t('averageMastery')}:{' '}
                      <strong className="text-ink font-black">{avgPct}%</strong>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="orange"
                    size="sm"
                    className="cursor-pointer shrink-0 font-bold rounded-full border-2 border-ink shadow-xs"
                    disabled={isAssigning}
                    onClick={() => onAssignRevision(cluster)}
                  >
                    {isAssigning ? t('assigning') : t('assignRevisionToGroup')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-0">
                {/* Students with gap */}
                <div className="rounded-2xl bg-surface-cream/30 p-3.5 border-2 border-ink">
                  <div className="flex items-center justify-between text-xs font-bold text-ink mb-2">
                    <span>Identified Students ({cluster.student_ids.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cluster.student_names.map((name, idx) => (
                      <span
                        key={cluster.student_ids[idx] || idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-surface-white border-2 border-ink text-ink shadow-xs"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Revision Plan */}
                {plan && (
                  <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-ink">
                        {t('suggestedRevisionPlan')}
                      </span>
                      <span className="text-xs font-bold rounded-full border-2 border-ink bg-surface-white px-2.5 py-0.5 text-ink shadow-xs">
                        {t('recommendedDuration', { mins: plan.recommended_duration_mins })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-ink">{plan.strategy}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Focus Competency:{' '}
                        <span className="font-bold text-ink">{plan.focus_skill}</span>
                      </p>
                    </div>

                    {plan.suggested_actions && plan.suggested_actions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-text-secondary">
                          Scaffolded Steps:
                        </span>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-ink font-medium pl-1">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
