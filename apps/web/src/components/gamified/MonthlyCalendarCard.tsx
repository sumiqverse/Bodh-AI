'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface MonthlyCalendarCardProps {
  monthName?: string;
  maxStreak?: number;
}

export function MonthlyCalendarCard({
  monthName = 'November',
  maxStreak = 9,
}: MonthlyCalendarCardProps): React.JSX.Element {
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // 30 days grid with mock realistic streak history (consecutive days leading to today)
  // E.g., attempted on days 12-20 (9 continuous days), 20 is today!
  const todayDate = 20;
  const attemptedDays = new Set([2, 3, 5, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

  // First day offset (e.g., Nov 1 starts on Friday -> index 4)
  const emptyDaysBefore = 4;
  const totalDays = 30;

  return (
    <div className="relative overflow-hidden rounded-card border-2 border-ink bg-surface-butter p-5 shadow-card text-ink">
      {/* Decorative peach circle accent on corner */}
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-surface-peach-light/60 pointer-events-none -z-0" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-ink" />
          <h3 className="text-base font-bold text-ink">Monthly Activity</h3>
        </div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-ink/80 px-2 py-0.5 rounded-full border border-ink/30 bg-surface-yellow">
          {monthName}
        </span>
      </div>

      {/* 7-column Calendar Grid */}
      <div className="relative z-10">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {daysOfWeek.map((day, idx) => (
            <span key={idx} className="text-xs font-bold text-ink/70">
              {day}
            </span>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Empty spacer cells */}
          {Array.from({ length: emptyDaysBefore }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8 w-8" />
          ))}

          {/* Actual days */}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const isToday = day === todayDate;
            const isAttempted = attemptedDays.has(day);

            let cellClass =
              'h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition-transform hover:scale-110 select-none';

            if (isToday) {
              cellClass += ' bg-primary-orange text-white font-black ring-2 ring-ink shadow-sm';
            } else if (isAttempted) {
              cellClass += ' bg-primary-orange text-white font-bold';
            } else {
              cellClass += ' text-ink/70 hover:bg-surface-yellow/60';
            }

            return (
              <div key={day} className={cellClass} title={`Day ${day}`}>
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend Row */}
      <div className="relative z-10 mt-4 pt-3 border-t border-ink/20 flex flex-wrap items-center justify-between text-[11px] font-bold text-ink/80">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-orange border border-ink/40" />
          <span>Attempted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-orange ring-2 ring-ink" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1 text-primary-orange-dark">
          <span>Max streak: {maxStreak} days</span>
          <span>🔥</span>
        </div>
      </div>
    </div>
  );
}
