'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@bodhai/ui';
import type { ClassSuggestionsResponse, SuggestionItem } from '@bodhai/api-client';

interface SuggestionsDecisionHubProps {
  readonly suggestions: ClassSuggestionsResponse;
  readonly onRecordDecision: (
    suggestionId: string,
    decision: 'accept' | 'edit' | 'ignore' | 'override',
    notes?: string,
  ) => Promise<void>;
  readonly onSelectStudent?: (studentId: string) => void;
}

export function SuggestionsDecisionHub({
  suggestions,
  onRecordDecision,
  onSelectStudent,
}: SuggestionsDecisionHubProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.suggestions');

  const [editingNotesId, setEditingNotesId] = React.useState<string | null>(null);
  const [decisionType, setDecisionType] = React.useState<'edit' | 'override' | null>(null);
  const [teacherNotes, setTeacherNotes] = React.useState<string>('');
  const [inProgressId, setInProgressId] = React.useState<string | null>(null);
  const [statusMap, setStatusMap] = React.useState<Record<string, string>>({});

  const handleSimpleDecision = async (
    suggestionId: string,
    decision: 'accept' | 'ignore',
  ): Promise<void> => {
    setInProgressId(suggestionId);
    try {
      await onRecordDecision(suggestionId, decision);
      setStatusMap((prev) => ({ ...prev, [suggestionId]: decision }));
    } finally {
      setInProgressId(null);
    }
  };

  const handleOpenEdit = (suggestionId: string, type: 'edit' | 'override'): void => {
    setEditingNotesId(suggestionId);
    setDecisionType(type);
    setTeacherNotes('');
  };

  const handleSubmitEdit = async (suggestionId: string): Promise<void> => {
    if (!decisionType) return;
    setInProgressId(suggestionId);
    try {
      await onRecordDecision(suggestionId, decisionType, teacherNotes);
      setStatusMap((prev) => ({ ...prev, [suggestionId]: decisionType }));
      setEditingNotesId(null);
      setDecisionType(null);
      setTeacherNotes('');
    } finally {
      setInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-xs bg-primary/10 text-primary border-primary/30 font-semibold"
              >
                {t('disclaimerBadge')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              {t('disclaimerText')}
            </p>
          </div>
        </div>
      </div>

      {suggestions.suggestions.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            ✓
          </div>
          <h3 className="mt-4 font-semibold text-lg text-foreground">No Pending Suggestions</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            All students are on active learning pathways or all current advisory suggestions have
            been reviewed.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.suggestions.map((item: SuggestionItem) => {
            const currentStatus = statusMap[item.suggestion_id] || item.status || 'pending';
            const isBusy = inProgressId === item.suggestion_id;
            const isEditing = editingNotesId === item.suggestion_id;
            const evidenceEntries = Object.entries(item.evidence || {});

            return (
              <Card
                key={item.suggestion_id}
                className="border-border shadow-xs hover:border-border/80 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-xs uppercase tracking-wider font-semibold"
                        >
                          {item.skill_code}
                        </Badge>
                        {item.is_ai_suggestion && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-primary/5 text-primary border-primary/20"
                          >
                            AI Advisory
                          </Badge>
                        )}
                        {currentStatus !== 'pending' && (
                          <Badge
                            variant={
                              currentStatus === 'accept' || currentStatus === 'accepted'
                                ? 'success'
                                : 'outline'
                            }
                            className="text-xs font-semibold capitalize"
                          >
                            {currentStatus}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        {item.student_name && <span>{item.student_name}</span>}
                        {item.student_name && (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                        <span className="text-primary font-medium">
                          {item.title || item.skill_name}
                        </span>
                      </CardTitle>
                    </div>

                    {onSelectStudent && item.student_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-xs"
                        onClick={() => onSelectStudent(item.student_id as string)}
                      >
                        Profile →
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0 text-xs">
                  {/* Action Description */}
                  <div className="rounded-md bg-muted/30 p-3 border border-border">
                    <span className="font-semibold text-foreground block mb-0.5">
                      {t('actionLabel')}:
                    </span>
                    <p className="text-foreground/90 text-xs">{item.recommended_action}</p>
                  </div>

                  {/* Evidence & Rationale Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px] block mb-1.5">
                        {t('evidenceLabel')}
                      </span>
                      {evidenceEntries.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">
                          Baseline diagnostic telemetry
                        </p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-foreground/80 text-xs">
                          {evidenceEntries.map(([k, v]) => (
                            <li key={k}>
                              <span className="font-medium capitalize">
                                {k.replace(/_/g, ' ')}:
                              </span>{' '}
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px] block mb-1.5">
                        {t('rationaleLabel')}
                      </span>
                      <p className="text-foreground/80 text-xs leading-relaxed">{item.rationale}</p>
                    </div>
                  </div>

                  {/* Decision Actions Bar */}
                  {isEditing ? (
                    <div className="pt-2 border-t border-border space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          {decisionType === 'edit' ? t('edit') : t('override')} — Instructional
                          Notes:
                        </label>
                        <Input
                          value={teacherNotes}
                          onChange={(e) => setTeacherNotes(e.target.value)}
                          placeholder={t('teacherNotesPlaceholder')}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSubmitEdit(item.suggestion_id)}
                          className="cursor-pointer text-xs"
                        >
                          Confirm Decision
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => setEditingNotesId(null)}
                          className="cursor-pointer text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground italic">
                        Teacher decision stored in audit log
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSimpleDecision(item.suggestion_id, 'accept')}
                          className="cursor-pointer text-xs"
                        >
                          {t('accept')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenEdit(item.suggestion_id, 'edit')}
                          className="cursor-pointer text-xs"
                        >
                          {t('edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenEdit(item.suggestion_id, 'override')}
                          className="cursor-pointer text-xs"
                        >
                          {t('override')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSimpleDecision(item.suggestion_id, 'ignore')}
                          className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
                        >
                          {t('ignore')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
