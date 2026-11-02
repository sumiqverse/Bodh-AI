'use client';

import * as React from 'react';
import { EfficiencyDonut } from './MascotIcons';
import { TrendingUp, ArrowDown } from 'lucide-react';

interface LearningEfficiencyCardProps {
  efficiencyRate?: number;
  accuracyDelta?: string;
  activeDaysDelta?: string;
}

export function LearningEfficiencyCard({
  efficiencyRate = 73,
  accuracyDelta = '+4%',
  activeDaysDelta = '−1',
}: LearningEfficiencyCardProps): React.JSX.Element {
  return (
    <div className="rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5 flex flex-col justify-between">
      <div>
        {/* Title */}
        <h3 className="text-base font-bold text-ink dark:text-white mb-3">Learning Efficiency</h3>

        {/* Legend + Donut Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Legend on Left */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-orange shrink-0" />
              <span className="font-medium text-ink dark:text-white">Quiz accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-yellow shrink-0 border border-ink/40" />
              <span className="font-medium text-text-secondary dark:text-muted-foreground">
                Active Learning
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-peach shrink-0 border border-ink/40" />
              <span className="font-medium text-text-secondary dark:text-muted-foreground">
                Incomplete Tasks
              </span>
            </div>
          </div>

          {/* Donut Chart on Right */}
          <EfficiencyDonut percentage={efficiencyRate} className="w-22 h-22 shrink-0" />
        </div>
      </div>

      {/* Thin Orange Divider */}
      <div className="my-3 border-t-2 border-primary-orange/30" />

      {/* Weekly Report Deltas */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Accuracy {accuracyDelta}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-text-secondary dark:text-muted-foreground">
          <ArrowDown className="h-3.5 w-3.5 text-amber-500" />
          <span>Active Days {activeDaysDelta}</span>
        </div>
      </div>
    </div>
  );
}
