'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@bodhai/ui';
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
          <span className="text-xs font-semibold text-muted-foreground">
            {t('timeWindowLabel')}:
          </span>
          <div className="inline-flex rounded-lg border border-border p-1 bg-card">
            {dayOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onDaysChange(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  days === opt
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('daysOption', { days: opt })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {warnings.warnings.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            ✓
          </div>
          <h3 className="mt-4 font-semibold text-lg text-foreground">{t('emptyTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t('emptyDesc')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warnings.warnings.map((student: EarlyWarningItem) => {
            const isStalled = student.warning_type === 'stalled';
            const isDropped = student.warning_type === 'dropped';

            return (
              <Card
                key={student.student_id}
                className="border-border hover:border-destructive/40 shadow-xs transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">
                          {student.student_name}
                        </CardTitle>
                        {student.roll_number && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ({t('rollPrefix')} {student.roll_number})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {student.message} ({student.days_inactive_or_stalled} days)
                      </p>
                    </div>

                    <Badge
                      variant={isStalled || isDropped ? 'destructive' : 'outline'}
                      className="text-xs shrink-0 capitalize"
                    >
                      {isStalled ? t('stalledBadge') : isDropped ? 'Dropped' : t('inactiveBadge')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  {student.suggested_action && (
                    <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-2.5">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
                        {t('recommendedAction')}:
                      </span>
                      <p className="text-amber-900/90 dark:text-amber-200">
                        {student.suggested_action}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs"
                      onClick={() => onSelectStudent(student.student_id)}
                    >
                      View Student Profile →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
