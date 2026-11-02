'use client';

import * as React from 'react';
import { SquirrelAvatar } from './MascotIcons';

interface GreetingBannerProps {
  studentName?: string;
  streakDays?: number;
  bonusXp?: number;
}

export function GreetingBanner({
  studentName = 'Karan',
  streakDays = 9,
  bonusXp = 150,
}: GreetingBannerProps): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
      {/* Left: Hero Greeting */}
      <div>
        <h1 className="font-extrabold text-3xl sm:text-4xl text-ink dark:text-white tracking-tight">
          Hello {studentName}!
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground mt-0.5">
          Ready to continue your mastery quest today?
        </p>
      </div>

      {/* Right: Mascot + Speech Bubble */}
      <div className="flex items-center gap-3 self-end sm:self-center">
        {/* Speech Bubble */}
        <div className="relative rounded-2xl border-2 border-ink bg-surface-cream px-4 py-2 text-xs font-bold text-ink shadow-sm max-w-[240px]">
          <p>
            You&apos;re on a <span className="text-primary-orange">{streakDays}-day streak</span>!
            Keep it going for <span className="text-primary-orange-dark">+{bonusXp} XP</span> today!
            🔥
          </p>
          {/* Speech bubble arrow/tail pointing to the right mascot */}
          <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-ink" />
          <div className="hidden sm:block absolute top-1/2 -right-1.5 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-surface-cream" />
        </div>

        {/* Mascot Avatar */}
        <div className="relative shrink-0">
          <SquirrelAvatar className="w-14 h-14" />
        </div>
      </div>
    </div>
  );
}
