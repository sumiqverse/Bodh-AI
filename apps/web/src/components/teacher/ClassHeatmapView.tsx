'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Flame, Target, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Extract ordered topics preserving natural textbook chapter sequence
  const topicsWithInfo = React.useMemo(() => {
    const map = new Map<string, { chapterNumber: number; skillCount: number }>();
    let chapterCounter = 1;
    heatmap.skills.forEach((sk) => {
      const existing = map.get(sk.topic_name);
      if (existing) {
        existing.skillCount += 1;
      } else {
        map.set(sk.topic_name, {
          chapterNumber: chapterCounter++,
          skillCount: 1,
        });
      }
    });
    return Array.from(map.entries()).map(([name, info]) => ({
      name,
      chapterNumber: info.chapterNumber,
      skillCount: info.skillCount,
    }));
  }, [heatmap.skills]);

  // Filter skills by selected topic
  const filteredSkills = React.useMemo(() => {
    if (selectedTopic === 'all') return heatmap.skills;
    return heatmap.skills.filter((sk) => sk.topic_name === selectedTopic);
  }, [heatmap.skills, selectedTopic]);

  // Group consecutive filtered skills by topic for the super-header row
  const topicHeaders = React.useMemo(() => {
    const groups: { name: string; chapterNumber: number; count: number }[] = [];
    filteredSkills.forEach((sk) => {
      const topicInfo = topicsWithInfo.find((t) => t.name === sk.topic_name);
      const chNum = topicInfo?.chapterNumber || 1;
      const last = groups[groups.length - 1];
      if (last && last.name === sk.topic_name) {
        last.count += 1;
      } else {
        groups.push({
          name: sk.topic_name,
          chapterNumber: chNum,
          count: 1,
        });
      }
    });
    return groups;
  }, [filteredSkills, topicsWithInfo]);

  // Filter students by search query
  const filteredStudents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return heatmap.students;
    return heatmap.students.filter((st) => {
      const name = (
        st.student_name ||
        (st as unknown as { full_name?: string }).full_name ||
        (st as unknown as { username?: string }).username ||
        ''
      ).toLowerCase();
      const roll = (st.roll_number || '').toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [heatmap.students, searchQuery]);

  // Fast cell lookup map: studentId:skillId -> HeatmapCell
  const cellMap = React.useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    heatmap.matrix.forEach((cell) => {
      map.set(`${cell.student_id}:${cell.skill_id}`, cell);
    });
    return map;
  }, [heatmap.matrix]);

  const scrollHorizontal = (offset: number) => {
    tableContainerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* 4 Neo-Brutalist Stat Tiles directly matching design.md */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Mastered Tile (surface-cream) */}
        <div className="rounded-card border-2 border-ink bg-surface-cream p-5 shadow-card flex flex-col justify-between min-h-[130px] relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
          <div className="relative z-10">
            <span className="text-3xl font-black text-ink block tracking-tight">
              {heatmap.summary.mastered.toLocaleString()}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1 block">
              {t('mastered')}
            </span>
          </div>
          <div className="flex items-center justify-between relative z-10 pt-3">
            <span className="text-[11px] font-bold text-emerald-900 bg-emerald-200/80 px-2.5 py-0.5 rounded-full border border-ink/40">
              ≥ 95% Mastery, 3 attempts
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-white border-2 border-ink shadow-xs">
              <Trophy className="w-5 h-5 text-emerald-700" />
            </span>
          </div>
          <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-surface-yellow/40 pointer-events-none" />
        </div>

        {/* 2. In Progress Tile (surface-yellow) */}
        <div className="rounded-card border-2 border-ink bg-surface-yellow p-5 shadow-card flex flex-col justify-between min-h-[130px] relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
          <div className="relative z-10">
            <span className="text-3xl font-black text-ink block tracking-tight">
              {heatmap.summary.partial.toLocaleString()}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1 block">
              {t('partial')}
            </span>
          </div>
          <div className="flex items-center justify-between relative z-10 pt-3">
            <span className="text-[11px] font-bold text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-ink/40">
              ≥ 40%, not yet mastered
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-white border-2 border-ink shadow-xs">
              <Flame className="w-5 h-5 text-amber-700" />
            </span>
          </div>
          <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-surface-cream/50 pointer-events-none" />
        </div>

        {/* 3. Not Started Tile (surface-blue) */}
        <div className="rounded-card border-2 border-ink bg-surface-blue p-5 shadow-card flex flex-col justify-between min-h-[130px] relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
          <div className="relative z-10">
            <span className="text-3xl font-black text-ink block tracking-tight">
              {heatmap.summary.not_learned.toLocaleString()}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1 block">
              {t('notLearned')}
            </span>
          </div>
          <div className="flex items-center justify-between relative z-10 pt-3">
            <span className="text-[11px] font-bold text-blue-950 bg-blue-200/80 px-2.5 py-0.5 rounded-full border border-ink/40">
              &lt; 40%
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-white border-2 border-ink shadow-xs">
              <Target className="w-5 h-5 text-blue-700" />
            </span>
          </div>
          <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-surface-white/40 pointer-events-none" />
        </div>

        {/* 4. Legend Tile (surface-pink) */}
        <div className="rounded-card border-2 border-ink bg-surface-pink p-5 shadow-card flex flex-col justify-between min-h-[130px] relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
          <div className="relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ink" />
              {t('patternLegend')}
            </span>
          </div>
          <div className="space-y-1.5 relative z-10 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="w-3.5 h-3.5 rounded-sm bg-emerald-400 border border-ink inline-block shrink-0 shadow-xs" />
              <span>{t('masteredPattern')} (≥95%, 3 attempts)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="w-3.5 h-3.5 rounded-sm bg-amber-400 border border-ink inline-block shrink-0 shadow-xs" />
              <span>{t('partialPattern')} (≥40%, not mastered)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="w-3.5 h-3.5 rounded-sm bg-surface-white border border-ink inline-block shrink-0 shadow-xs" />
              <span>{t('notLearnedPattern')} (&lt;40%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="w-3.5 h-3.5 rounded-sm bg-slate-300 border border-ink inline-block" />
              <span>{t('unassessed')}</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-surface-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Filters & Search Controls in Neo-Brutalist Card */}
      <div className="rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b-2 border-ink flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-cream/30">
          <div>
            <h2 className="text-lg font-black text-ink">{t('title')}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{t('description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-52">
              <input
                id="student-search-input"
                type="search"
                placeholder={t('searchStudent')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-full border-2 border-ink bg-surface-white px-3.5 text-xs font-bold text-ink placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-orange shadow-xs"
              />
            </div>
            <div className="w-full sm:w-auto min-w-[260px]">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                aria-label={t('filterTopic')}
                className="w-full h-9 rounded-full border-2 border-ink bg-surface-cream px-3 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-primary-orange shadow-xs cursor-pointer"
              >
                <option value="all">
                  {t('allTopics')} ({topicsWithInfo.length} Chapters • {heatmap.skills.length}{' '}
                  Skills)
                </option>
                {topicsWithInfo.map((top) => (
                  <option key={top.name} value={top.name}>
                    Ch {top.chapterNumber}: {top.name} ({top.skillCount} skills)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => scrollHorizontal(-350)}
                className="h-9 px-3 rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-xs font-black text-ink shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Scroll table left"
                aria-label="Scroll table left"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontal(350)}
                className="h-9 px-3 rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-xs font-black text-ink shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Scroll table right"
                aria-label="Scroll table right"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          {/* Scrollable Virtualized Heatmap Matrix Container */}
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-h-[600px] overflow-y-auto focus:outline-none"
            tabIndex={0}
            role="region"
            aria-label={t('title')}
          >
            <table className="w-full border-collapse text-xs" id="teacher-heatmap-matrix">
              <thead className="sticky top-0 z-20 bg-surface-cream/95 dark:bg-background/95 backdrop-blur border-b-2 border-ink shadow-xs">
                {/* Row 1: Topic / Chapter Grouping Super-Header */}
                <tr className="border-b border-ink/30 bg-surface-cream text-[11px]">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 bg-surface-cream dark:bg-background px-4 py-2 text-left font-black text-text-secondary uppercase tracking-wider border-r-2 border-ink min-w-[180px] shadow-xs"
                  >
                    Curriculum Topics
                  </th>
                  {topicHeaders.map((group, idx) => (
                    <th
                      key={`${group.name}-${idx}`}
                      scope="colgroup"
                      colSpan={group.count}
                      className="px-2 py-1.5 text-center font-black text-ink border-r-2 border-ink bg-surface-yellow/20 dark:bg-amber-950/20"
                      title={group.name}
                    >
                      <div className="truncate max-w-[240px] mx-auto font-black text-[11px]">
                        Ch {group.chapterNumber}: {group.name}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Row 2: Skill-level Column Headers */}
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-30 bg-surface-cream dark:bg-background px-4 py-2.5 text-left font-black text-ink border-r-2 border-ink min-w-[180px] shadow-xs"
                  >
                    {t('studentColumn')}
                  </th>
                  {filteredSkills.map((sk) => {
                    const skillCode = sk.skill_code || '';
                    const skillName = sk.skill_name || '';
                    return (
                      <th
                        key={sk.skill_id}
                        scope="col"
                        className="px-2 py-2 text-center font-bold text-ink min-w-[80px] max-w-[110px] border-r border-ink/20 hover:bg-surface-cream transition-colors"
                        title={`${skillCode}: ${skillName} (${sk.topic_name})`}
                      >
                        <div className="truncate font-black">{skillCode}</div>
                        <div className="truncate text-[10px] text-text-secondary font-medium">
                          {skillName}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-ink/10">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={filteredSkills.length + 1}
                      className="text-center py-12 text-text-secondary font-medium"
                    >
                      {heatmap.students.length === 0
                        ? 'No students enrolled in this class yet. Enrolled students will appear here.'
                        : 'No students found matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const studentDisplayName = st.student_name || 'Student';
                    return (
                      <tr
                        key={st.student_id}
                        className="hover:bg-surface-cream/20 transition-colors"
                      >
                        {/* Sticky Student Name Header with Modal Trigger */}
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-surface-white dark:bg-card px-4 py-2.5 text-left font-bold text-ink border-r-2 border-ink whitespace-nowrap shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectStudent(st.student_id)}
                            className="text-left font-bold text-ink hover:text-primary-orange focus:outline-none rounded px-1 -mx-1 cursor-pointer"
                            aria-label={`View detailed profile for ${studentDisplayName}`}
                          >
                            <span className="font-extrabold">{studentDisplayName}</span>
                            {st.roll_number && (
                              <span className="ml-1.5 text-[11px] text-text-secondary font-mono font-medium">
                                (#{st.roll_number})
                              </span>
                            )}
                          </button>
                        </th>

                        {/* Heatmap Cells */}
                        {filteredSkills.map((sk) => {
                          const skillName = sk.skill_name || '';
                          const cell = cellMap.get(`${st.student_id}:${sk.skill_id}`);
                          const state = cell?.state || 'unassessed';
                          const pScore = cell?.p_mastery ?? 0;
                          const pct = Math.round(pScore * 100);

                          let bgClass = 'bg-slate-50 text-slate-700 border-ink/10';
                          let stateLabel = t('notLearned');

                          if (state === 'mastered') {
                            bgClass =
                              'bg-emerald-200/90 text-emerald-950 border-ink/20 font-black shadow-xs';
                            stateLabel = t('mastered');
                          } else if (state === 'partial') {
                            bgClass =
                              'bg-amber-200/90 text-amber-950 border-ink/20 font-black shadow-xs';
                            stateLabel = t('partial');
                          } else if (state === 'unassessed') {
                            bgClass = 'bg-slate-300 text-slate-700 border-ink/10';
                            stateLabel = t('unassessed');
                          }
                          const resultLabel =
                            state === 'unassessed' ? stateLabel : `${stateLabel} (${pct}%)`;

                          return (
                            <td
                              key={sk.skill_id}
                              className="p-1 text-center border-r border-ink/10 transition-colors"
                              title={`${studentDisplayName} • ${skillName}: ${resultLabel}`}
                            >
                              <button
                                type="button"
                                onClick={() => onSelectStudent(st.student_id)}
                                aria-label={`${studentDisplayName}: ${skillName} is ${resultLabel}`}
                                className={`w-full h-8 flex items-center justify-center rounded-md border ${bgClass} hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
                              >
                                <span className="text-xs font-black">
                                  {pScore > 0 ? `${pct}%` : '—'}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-surface-cream/40 border-t-2 border-ink flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-secondary font-bold">
            <span>
              Showing {filteredStudents.length} of {heatmap.total_students} students ×{' '}
              {filteredSkills.length} of {heatmap.total_skills} skills across{' '}
              {selectedTopic === 'all'
                ? `all ${topicsWithInfo.length} NCERT chapters`
                : selectedTopic}
            </span>
            <span>{t('virtualizedNotice')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
