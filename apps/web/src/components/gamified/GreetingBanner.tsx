'use client';

import * as React from 'react';
import { SquirrelAvatar } from './MascotIcons';

interface GreetingBannerProps {
  studentName?: string;
  streakDays?: number;
}

export function GreetingBanner({
  studentName = 'Karan',
  streakDays = 9,
}: GreetingBannerProps): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
      {/* Hello Greeting + Mascot + Speech Bubble in horizontal flow */}
      <div className="flex flex-wrap items-center gap-3">
        <h1
          suppressHydrationWarning
          className="font-extrabold text-2xl sm:text-3xl text-ink dark:text-white tracking-tight whitespace-nowrap"
        >
          Hello {studentName}!
        </h1>

        {/* Mascot Avatar */}
        <div className="relative shrink-0">
          <SquirrelAvatar className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-xs" />
        </div>

        {/* Speech Bubble with left-pointing arrow */}
        <div className="relative rounded-2xl border-2 border-ink bg-surface-cream px-3.5 py-1.5 text-xs font-bold text-ink shadow-xs">
          <p suppressHydrationWarning>
            You&apos;re on fire! 🔥 Keep the{' '}
            <span className="text-primary-orange underline decoration-2">
              {streakDays}-day streak
            </span>{' '}
            going!
          </p>
          {/* Speech bubble arrow pointing LEFT to the squirrel */}
          <div className="hidden sm:block absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[7px] border-r-ink" />
          <div className="hidden sm:block absolute top-1/2 -left-1.5 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-surface-cream" />
        </div>
      </div>
    </div>
  );
}
