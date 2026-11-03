'use client';

import * as React from 'react';
import { Play, ArrowUpRight, Check } from 'lucide-react';
import { SquirrelWithClock, PuzzlePiecesArt } from './MascotIcons';

interface TodayChallengeCardProps {
  onStartChallenge?: () => void;
  xpReward?: number;
  isCompleted?: boolean;
}

export function TodayChallengeCard({
  onStartChallenge,
  xpReward = 50,
  isCompleted = false,
}: TodayChallengeCardProps): React.JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5 flex flex-col justify-between">
      {/* Decorative corner accent */}
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-surface-peach-light pointer-events-none -z-0" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-bold text-ink dark:text-white">Today's Challenge</h3>
          <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
            {isCompleted ? (
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                Completed today! +{xpReward} XP earned 🎉
              </span>
            ) : (
              <>
                Test your skills & earn{' '}
                <span className="font-extrabold text-primary-orange">+{xpReward} XP!</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartChallenge}
          aria-label="Open challenge"
          className="h-8 w-8 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center text-ink hover:bg-surface-yellow transition-colors cursor-pointer"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Visual Centerpiece: Mascot with Clock on Left | Orange Play in Center | Puzzle Art on Right */}
      <div className="relative z-10 my-2 flex items-center justify-between px-1">
        <SquirrelWithClock className="w-16 h-16 shrink-0" />

        <button
          type="button"
          onClick={onStartChallenge}
          aria-label={isCompleted ? 'Review challenge' : 'Play challenge'}
          className={`h-12 w-12 rounded-full border-2 border-ink flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
            isCompleted
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-primary-orange hover:bg-primary-orange-dark'
          }`}
        >
          {isCompleted ? (
            <Check className="h-6 w-6 stroke-[3]" />
          ) : (
            <Play className="h-5 w-5 ml-0.5 fill-white" />
          )}
        </button>

        <PuzzlePiecesArt className="w-14 h-14 shrink-0" />
      </div>

      {/* Bottom Info Pill */}
      <div
        className={`relative z-10 mt-3 rounded-full border-2 border-ink px-3 py-1.5 text-center transition-colors ${
          isCompleted ? 'bg-emerald-100 dark:bg-emerald-950/60' : 'bg-surface-cream'
        }`}
      >
        <span
          className={`text-[11px] font-semibold ${
            isCompleted ? 'text-emerald-900 dark:text-emerald-200' : 'text-ink'
          }`}
        >
          {isCompleted
            ? 'Completed today · Daily streak protected! 🔥'
            : 'Updated daily · Skipping resets streak 🔥'}
        </span>
      </div>
    </div>
  );
}
