'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@bodhai/ui';
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

  const statusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'accept':
      case 'accepted':
        return t('statusAccepted');
      case 'edit':
      case 'edited':
        return t('statusEdited');
      case 'ignore':
      case 'ignored':
        return t('statusIgnored');
      case 'override':
      case 'overridden':
        return t('statusOverridden');
      default:
        return t('statusPending');
    }
  };

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
        <h2 className="text-xl font-black tracking-tight text-ink dark:text-white">{t('title')}</h2>
        <div className="mt-3 rounded-2xl border-2 border-ink bg-surface-cream/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-white px-2.5 py-0.5 text-ink shadow-xs">
                {t('disclaimerBadge')}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl font-bold">
              {t('disclaimerText')}
            </p>
          </div>
        </div>
      </div>

      {suggestions.suggestions.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-ink p-10 text-center bg-surface-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-cream border-2 border-ink text-2xl font-black shadow-xs">
            ✓
          </div>
          <h3 className="mt-4 font-black text-lg text-ink">No Pending Suggestions</h3>
          <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">
            All students are on active learning pathways or all current advisory suggestions have
            been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.suggestions.map((item: SuggestionItem) => {
            const currentStatus = statusMap[item.suggestion_id] || item.status || 'pending';
            const isBusy = inProgressId === item.suggestion_id;
            const isEditing = editingNotesId === item.suggestion_id;
            const evidenceEntries = Object.entries(item.evidence || {});

            return (
              <div
                key={item.suggestion_id}
                className="rounded-card border-2 border-ink bg-surface-white dark:bg-card p-5 shadow-card hover:-translate-y-0.5 transition-transform"
              >
                <div className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs uppercase tracking-wider font-mono font-bold text-text-secondary">
                          {item.skill_code}
                        </span>
                        {item.is_ai_suggestion && (
                          <span className="text-[11px] font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-cream px-2 py-0.5 text-ink shadow-xs">
                            AI Advisory
                          </span>
                        )}
                        {currentStatus !== 'pending' && (
                          <span className="text-xs font-bold rounded-full border-2 border-ink bg-surface-yellow px-2 py-0.5 text-ink shadow-xs">
                            {statusLabel(currentStatus)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-ink dark:text-white flex items-center gap-2">
                        {item.student_name && <span>{item.student_name}</span>}
                        {item.student_name && (
                          <span className="text-text-secondary font-normal">—</span>
                        )}
                        <span className="text-primary-orange font-extrabold">
                          {item.title || item.skill_name}
                        </span>
                      </h4>
                    </div>

                    {onSelectStudent && item.student_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink shadow-xs"
                        onClick={() => onSelectStudent(item.student_id as string)}
                      >
                        Profile →
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-0 text-xs">
                  {/* Action Description */}
                  <div className="rounded-2xl bg-surface-cream/30 p-3.5 border-2 border-ink">
                    <span className="font-black text-ink block mb-0.5">{t('actionLabel')}:</span>
                    <p className="text-ink text-xs font-medium">{item.recommended_action}</p>
                  </div>

                  {/* Evidence & Rationale Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-ink bg-surface-white p-3.5 shadow-xs">
                      <span className="font-black text-text-secondary uppercase tracking-wider text-[11px] block mb-1.5">
                        {t('evidenceLabel')}
                      </span>
                      {evidenceEntries.length === 0 ? (
                        <p className="text-text-secondary text-xs italic">
                          Baseline diagnostic telemetry
                        </p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-ink text-xs font-medium">
                          {evidenceEntries.map(([k, v]) => (
                            <li key={k}>
                              <span className="font-bold capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-ink bg-surface-white p-3.5 shadow-xs">
                      <span className="font-black text-text-secondary uppercase tracking-wider text-[11px] block mb-1.5">
                        {t('rationaleLabel')}
                      </span>
                      <p className="text-ink text-xs leading-relaxed font-medium">
                        {item.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Decision Actions Bar */}
                  {isEditing ? (
                    <div className="pt-2 border-t-2 border-ink/20 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-ink block mb-1">
                          {decisionType === 'edit' ? t('edit') : t('override')} — Instructional
                          Notes:
                        </label>
                        <Input
                          value={teacherNotes}
                          onChange={(e) => setTeacherNotes(e.target.value)}
                          placeholder={t('teacherNotesPlaceholder')}
                          className="text-xs font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="orange"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSubmitEdit(item.suggestion_id)}
                          className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink shadow-xs"
                        >
                          Confirm Decision
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => setEditingNotesId(null)}
                          className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t-2 border-ink/20 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-text-secondary italic font-medium">
                        Teacher decision stored in audit log
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="orange"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSimpleDecision(item.suggestion_id, 'accept')}
                          className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink shadow-xs"
                        >
                          {t('accept')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenEdit(item.suggestion_id, 'edit')}
                          className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream shadow-xs"
                        >
                          {t('edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenEdit(item.suggestion_id, 'override')}
                          className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream shadow-xs"
                        >
                          {t('override')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSimpleDecision(item.suggestion_id, 'ignore')}
                          className="cursor-pointer text-xs font-bold text-text-secondary hover:text-ink rounded-full"
                        >
                          {t('ignore')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
