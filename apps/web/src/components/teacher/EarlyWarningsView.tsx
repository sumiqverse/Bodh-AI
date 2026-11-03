'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@bodhai/ui';
import type { ClassEarlyWarningsResponse, EarlyWarningItem } from '@bodhai/api-client';

interface EarlyWarningsViewProps {
  readonly warnings: ClassEarlyWarningsResponse;
  readonly days: number;
  readonly onDaysChange: (days: number) => void;
  readonly onSelectStudent: (studentId: string) => void;
}

export function EarlyWarningsView({
  warnings,
  days,
  onDaysChange,
  onSelectStudent,
}: EarlyWarningsViewProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.warnings');

  const dayOptions = [7, 14, 30];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>

        {/* Time window selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-secondary">{t('timeWindowLabel')}:</span>
          <div className="inline-flex rounded-full border-2 border-ink p-1 bg-surface-cream/50 shadow-xs">
            {dayOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onDaysChange(opt)}
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  days === opt
                    ? 'bg-[#E8800A] text-white border border-ink shadow-xs'
                    : 'text-ink hover:text-[#E8800A]'
                }`}
              >
                {t('daysOption', { days: opt })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {warnings.warnings.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-ink p-10 text-center bg-surface-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-cream border-2 border-ink text-2xl font-black shadow-xs">
            ✓
          </div>
          <h3 className="mt-4 font-black text-lg text-ink">{t('emptyTitle')}</h3>
          <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warnings.warnings.map((student: EarlyWarningItem) => {
            const isStalled = student.warning_type === 'stalled';
            const isDropped = student.warning_type === 'dropped';

            return (
              <div
                key={student.student_id}
                className="rounded-card border-2 border-ink bg-surface-white dark:bg-card p-5 shadow-card hover:-translate-y-0.5 transition-transform"
              >
                <div className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-ink dark:text-white">
                          {student.student_name}
                        </h4>
                        {student.roll_number && (
                          <span className="text-xs text-text-secondary font-mono font-bold">
                            ({t('rollPrefix')} {student.roll_number})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 font-bold">
                        {student.message} ({student.days_inactive_or_stalled} days)
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-ink shadow-xs shrink-0 ${
                        isStalled || isDropped
                          ? 'bg-surface-pink text-ink'
                          : 'bg-surface-cream text-ink'
                      }`}
                    >
                      {isStalled ? t('stalledBadge') : isDropped ? 'Dropped' : t('inactiveBadge')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-0 text-xs">
                  {student.suggested_action && (
                    <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 p-3 shadow-xs">
                      <span className="font-black text-ink block mb-0.5">
                        {t('recommendedAction')}:
                      </span>
                      <p className="text-text-secondary font-medium">{student.suggested_action}</p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream shadow-xs"
                      onClick={() => onSelectStudent(student.student_id)}
                    >
                      View Student Profile →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
