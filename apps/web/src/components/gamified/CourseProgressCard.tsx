'use client';

import * as React from 'react';
import { Play, ArrowUpRight } from 'lucide-react';
import { HexCoinIcon } from './MascotIcons';

interface ProgressItem {
  id: string;
  title: string;
  percentage: number;
  xpReward: number;
}

interface CourseProgressCardProps {
  courseTitle?: string;
  moduleLabel?: string;
  items?: ProgressItem[];
  onContinue?: () => void;
}

export function CourseProgressCard({
  courseTitle = 'NCERT Mathematics (Class 8)',
  moduleLabel = 'Module 4 of 6',
  items = [
    {
      id: 'alg',
      title: 'Algebraic Expressions & Identities',
      percentage: 68,
      xpReward: 120,
    },
    {
      id: 'lin',
      title: 'Linear Equations in One Variable',
      percentage: 84,
      xpReward: 150,
    },
  ],
  onContinue,
}: CourseProgressCardProps): React.JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5 sm:p-6">
      {/* Decorative Peach Circle in Corner */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-surface-peach-light pointer-events-none -z-0" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-white">Course Progress</h2>
          <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
            Continue where you left off
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          aria-label="View full course"
          className="h-9 w-9 rounded-full border-2 border-ink bg-surface-peach flex items-center justify-center text-ink hover:bg-surface-yellow transition-colors cursor-pointer"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main Row: Thumbnail on Left | Dashed Divider | Progress Stats on Right */}
      <div className="relative z-10 flex flex-col md:flex-row gap-5 items-stretch">
        {/* Left: Peach Thumbnail */}
        <div className="w-full md:w-56 shrink-0 rounded-2xl border-2 border-ink bg-surface-peach p-4 flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <span className="text-[11px] font-bold text-ink/70 uppercase tracking-wider">
            {moduleLabel}
          </span>

          <div className="my-3 flex flex-col items-center">
            {/* Play Button Icon */}
            <button
              type="button"
              onClick={onContinue}
              aria-label="Play module"
              className="h-12 w-12 rounded-full border-2 border-ink bg-primary-orange flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 cursor-pointer"
            >
              <Play className="h-5 w-5 ml-0.5 fill-white" />
            </button>
            <h3 className="font-extrabold text-sm text-ink mt-2.5 line-clamp-2 px-2">
              {courseTitle}
            </h3>
          </div>

          <span className="text-[10px] font-medium text-ink/60">Tap to resume</span>
        </div>

        {/* Dashed vertical divider for desktop */}
        <div className="hidden md:block w-0 border-r-2 border-dashed border-ink/40" />

        {/* Right: Progress Items & CTA */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-ink dark:text-white">
                  <span className="line-clamp-1">{item.title}</span>
                  <span className="text-primary-orange shrink-0 ml-2">
                    {item.percentage}% completed
                  </span>
                </div>

                {/* 6px Rounded Progress Track */}
                <div className="h-2 w-full rounded-full bg-surface-peach/50 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-orange transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                {/* Micro Hint: +XP on completion */}
                <div className="flex items-center gap-1.5 text-[11px] text-text-secondary dark:text-muted-foreground pt-0.5">
                  <HexCoinIcon className="w-3.5 h-3.5" />
                  <span>+{item.xpReward} XP on completion</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA: Continue Pill Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-white font-bold text-sm shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <span>Continue</span>
              <Play className="h-3.5 w-3.5 fill-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
