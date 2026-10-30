'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Select,
} from '@bodhai/ui';
import type { ClassHeatmapResponse, HeatmapCell } from '@bodhai/api-client';

interface ClassHeatmapViewProps {
  readonly heatmap: ClassHeatmapResponse;
  readonly onSelectStudent: (studentId: string) => void;
}

export function ClassHeatmapView({
  heatmap,
  onSelectStudent,
}: ClassHeatmapViewProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.heatmap');

  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Extract unique topics
  const topics = React.useMemo(() => {
    const set = new Set<string>();
    heatmap.skills.forEach((sk) => set.add(sk.topic_name));
    return Array.from(set).sort();
  }, [heatmap.skills]);

  // Filter skills by selected topic
  const filteredSkills = React.useMemo(() => {
    if (selectedTopic === 'all') return heatmap.skills;
    return heatmap.skills.filter((sk) => sk.topic_name === selectedTopic);
  }, [heatmap.skills, selectedTopic]);

  // Filter students by search query
  const filteredStudents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return heatmap.students;
    return heatmap.students.filter(
      (st) =>
        st.student_name.toLowerCase().includes(q) ||
        (st.roll_number && st.roll_number.toLowerCase().includes(q)),
    );
  }, [heatmap.students, searchQuery]);

  // Fast cell lookup map: studentId:skillId -> HeatmapCell
  const cellMap = React.useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    heatmap.matrix.forEach((cell) => {
      map.set(`${cell.student_id}:${cell.skill_id}`, cell);
    });
    return map;
  }, [heatmap.matrix]);

  return (
    <div className="space-y-6">
      {/* Summary KPI & Accessible Pattern Legend */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {t('mastered')}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {heatmap.summary.mastered.toLocaleString()}
              </p>
            </div>
            <div
              className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300"
              aria-hidden="true"
            >
              ✓
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {t('partial')}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {heatmap.summary.partial.toLocaleString()}
              </p>
            </div>
            <div
              className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-500 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            >
              ◐
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {t('notLearned')}
              </p>
              <p className="text-2xl font-bold text-muted-foreground">
                {heatmap.summary.not_learned.toLocaleString()}
              </p>
            </div>
            <div
              className="h-9 w-9 rounded-full bg-muted border border-dashed border-border flex items-center justify-center font-bold text-muted-foreground"
              aria-hidden="true"
            >
              ○
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-border">
          <CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {t('patternLegend')}
            </p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-bold text-emerald-600">✓</span>
              <span>{t('masteredPattern')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-bold text-amber-600">◐</span>
              <span>{t('partialPattern')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-bold text-slate-500">○</span>
              <span>{t('notLearnedPattern')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56">
                <Input
                  id="student-search-input"
                  type="search"
                  placeholder={t('searchStudent')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="w-48">
                <Select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  options={[
                    { value: 'all', label: t('allTopics') },
                    ...topics.map((top) => ({ value: top, label: top })),
                  ]}
                  aria-label={t('filterTopic')}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Scrollable Virtualized Heatmap Matrix Container */}
          <div
            className="overflow-x-auto max-h-[600px] overflow-y-auto border-t border-border focus:outline-none"
            tabIndex={0}
            role="region"
            aria-label={t('title')}
          >
            <table className="w-full border-collapse text-xs" id="teacher-heatmap-matrix">
              <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border shadow-xs">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-30 bg-background px-3 py-2.5 text-left font-semibold text-foreground border-r border-border min-w-[180px] shadow-xs"
                  >
                    {t('studentColumn')}
                  </th>
                  {filteredSkills.map((sk) => (
                    <th
                      key={sk.skill_id}
                      scope="col"
                      className="px-2 py-2 text-center font-medium text-foreground min-w-[72px] max-w-[100px] border-r border-border/40 hover:bg-muted/40 transition-colors"
                      title={`${sk.skill_code}: ${sk.skill_name} (${sk.topic_name})`}
                    >
                      <div className="truncate font-semibold">{sk.skill_code}</div>
                      <div className="truncate text-[10px] text-muted-foreground font-normal">
                        {sk.skill_name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={filteredSkills.length + 1}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {heatmap.students.length === 0
                        ? 'No students enrolled in this class yet. Enrolled students will appear here.'
                        : 'No students found matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.student_id} className="hover:bg-muted/30 transition-colors">
                      {/* Sticky Student Name Header with Modal Trigger */}
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium text-foreground border-r border-border whitespace-nowrap shadow-xs"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectStudent(st.student_id)}
                          className="text-left font-medium text-primary hover:underline focus:outline-hidden focus:ring-2 focus:ring-primary rounded px-1 -mx-1"
                          aria-label={`View detailed profile for ${st.student_name}`}
                        >
                          <span className="font-semibold">{st.student_name}</span>
                          {st.roll_number && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                              (#{st.roll_number})
                            </span>
                          )}
                        </button>
                      </th>

                      {/* Heatmap Cells */}
                      {filteredSkills.map((sk) => {
                        const cell = cellMap.get(`${st.student_id}:${sk.skill_id}`);
                        const state = cell?.state || 'not_learned';
                        const pScore = cell?.p_mastery ?? 0;

                        let bgClass = 'bg-muted/20 text-muted-foreground border-border/30';
                        let patternSymbol = '○';
                        let stateLabel = t('notLearned');

                        if (state === 'mastered') {
                          bgClass =
                            'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-400/50 dark:border-emerald-700/60 font-semibold';
                          patternSymbol = '✓';
                          stateLabel = t('mastered');
                        } else if (state === 'partial') {
                          bgClass =
                            'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-400/50 dark:border-amber-700/60 font-semibold';
                          patternSymbol = '◐';
                          stateLabel = t('partial');
                        }

                        return (
                          <td
                            key={sk.skill_id}
                            className={`p-1 text-center border-r border-border/30 ${bgClass} transition-colors`}
                            title={`${st.student_name} • ${sk.skill_name}: ${stateLabel} (${Math.round(pScore * 100)}%)`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectStudent(st.student_id)}
                              aria-label={`${st.student_name}: ${sk.skill_name} is ${stateLabel}`}
                              className="w-full h-8 flex flex-col items-center justify-center rounded-sm hover:scale-105 active:scale-95 transition-transform focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                              <span className="text-sm leading-none" aria-hidden="true">
                                {patternSymbol}
                              </span>
                              <span className="text-[9px] opacity-80 mt-0.5">
                                {pScore > 0 ? `${Math.round(pScore * 100)}%` : '—'}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('virtualizedNotice')}</span>
            <span>
              Showing {filteredStudents.length} of {heatmap.total_students} students ×{' '}
              {filteredSkills.length} of {heatmap.total_skills} skills
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
