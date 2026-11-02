'use client';

import * as React from 'react';
import { SquirrelWithTrophy, HexCoinIcon } from './MascotIcons';
import { Trophy } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  streakDays: number;
  avatarBg: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
  currentUserName?: string;
  currentUserRank?: number;
  currentUserXp?: number;
  currentUserStreak?: number;
}

export function LeaderboardCard({
  currentUserName = 'You (Karan)',
  currentUserRank = 10,
  currentUserXp = 1320,
  currentUserStreak = 9,
}: LeaderboardCardProps): React.JSX.Element {
  // Top 3 Podium learners
  const topThree: LeaderboardUser[] = [
    {
      rank: 2,
      name: 'Aarav S.',
      xp: 1540,
      streakDays: 14,
      avatarBg: 'bg-surface-blue',
    },
    {
      rank: 1,
      name: 'Priya K.',
      xp: 1820,
      streakDays: 18,
      avatarBg: 'bg-surface-yellow',
    },
    {
      rank: 3,
      name: 'Rohan M.',
      xp: 1390,
      streakDays: 11,
      avatarBg: 'bg-surface-peach',
    },
  ];

  // List rows (rank 4 to 6)
  const listLearners: LeaderboardUser[] = [
    { rank: 4, name: 'Ananya D.', xp: 1380, streakDays: 10, avatarBg: 'bg-surface-cream' },
    { rank: 5, name: 'Dev P.', xp: 1360, streakDays: 8, avatarBg: 'bg-surface-pink' },
    { rank: 6, name: 'Tanvi G.', xp: 1345, streakDays: 7, avatarBg: 'bg-surface-blue' },
  ];

  const second = topThree[0] ?? {
    rank: 2,
    name: 'Aarav S.',
    xp: 1540,
    streakDays: 14,
    avatarBg: 'bg-surface-blue',
  };
  const first = topThree[1] ?? {
    rank: 1,
    name: 'Priya K.',
    xp: 1820,
    streakDays: 18,
    avatarBg: 'bg-surface-yellow',
  };
  const third = topThree[2] ?? {
    rank: 3,
    name: 'Rohan M.',
    xp: 1390,
    streakDays: 11,
    avatarBg: 'bg-surface-peach',
  };

  return (
    <div className="rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5 flex flex-col justify-between">
      {/* Header with Trophy Mascot */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-ink dark:text-white">Leaderboard</h3>
          <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
            This Week's Top Learners
          </p>
        </div>

        <SquirrelWithTrophy className="w-12 h-12 -mt-2 -mr-1 shrink-0" />
      </div>

      {/* Podium Visualization (2nd - 1st - 3rd) */}
      <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2 text-center select-none">
        {/* 2nd Place Block */}
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full border-2 border-ink bg-surface-blue flex items-center justify-center text-xs font-bold text-ink mb-1 shadow-xs">
            {second.name.charAt(0)}
          </div>
          <span className="text-[11px] font-bold text-ink dark:text-white truncate max-w-[70px]">
            {second.name}
          </span>
          <div className="w-full h-16 rounded-t-lg border-2 border-ink bg-[#8B4A14] text-white flex flex-col items-center justify-center mt-1 shadow-sm">
            <span className="text-lg font-black leading-none">2</span>
            <span className="text-[10px] opacity-90 mt-0.5">{second.xp} XP</span>
          </div>
        </div>

        {/* 1st Place Block (Tallest) */}
        <div className="flex flex-col items-center">
          <div className="relative mb-1">
            <Trophy className="h-4 w-4 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-sm" />
            <div className="h-11 w-11 rounded-full border-2 border-ink bg-surface-yellow flex items-center justify-center text-xs font-extrabold text-ink shadow-xs">
              {first.name.charAt(0)}
            </div>
          </div>
          <span className="text-[11px] font-bold text-ink dark:text-white truncate max-w-[70px]">
            {first.name}
          </span>
          <div className="w-full h-22 rounded-t-lg border-2 border-ink bg-[#F39C12] text-white flex flex-col items-center justify-center mt-1 shadow-sm">
            <span className="text-xl font-black leading-none">1</span>
            <span className="text-[10px] font-bold mt-0.5">{first.xp} XP</span>
          </div>
        </div>

        {/* 3rd Place Block */}
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full border-2 border-ink bg-surface-peach flex items-center justify-center text-xs font-bold text-ink mb-1 shadow-xs">
            {third.name.charAt(0)}
          </div>
          <span className="text-[11px] font-bold text-ink dark:text-white truncate max-w-[70px]">
            {third.name}
          </span>
          <div className="w-full h-12 rounded-t-lg border-2 border-ink bg-[#D9A21B] text-white flex flex-col items-center justify-center mt-1 shadow-sm">
            <span className="text-base font-black leading-none">3</span>
            <span className="text-[10px] opacity-90 mt-0.5">{third.xp} XP</span>
          </div>
        </div>
      </div>

      {/* List Rows (Ranks 4+) */}
      <div className="space-y-2 my-3">
        {listLearners.map((learner) => (
          <div
            key={learner.rank}
            className="flex items-center justify-between p-2 rounded-full border-2 border-ink bg-surface-white dark:bg-card/70 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-ink dark:text-white w-4 text-center">
                #{learner.rank}
              </span>
              <div
                className={`h-6 w-6 rounded-full border border-ink ${learner.avatarBg} flex items-center justify-center font-bold text-[10px] text-ink`}
              >
                {learner.name.charAt(0)}
              </div>
              <span className="font-semibold text-ink dark:text-white truncate max-w-[90px]">
                {learner.name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold pr-1">
              <span className="text-primary-orange">{learner.streakDays}d 🔥</span>
              <span className="text-text-secondary dark:text-muted-foreground">
                {learner.xp} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Current User Row - Inverted Ink Style */}
      <div className="mt-2 rounded-full border-2 border-ink bg-ink text-white p-2.5 flex items-center justify-between text-xs shadow-card">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-surface-yellow w-5 text-center">
            #{currentUserRank}
          </span>
          <div className="h-6 w-6 rounded-full border border-white bg-primary-orange flex items-center justify-center font-bold text-[10px] text-white">
            Y
          </div>
          <span className="font-bold text-white truncate max-w-[100px]">{currentUserName}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold pr-1">
          <span className="text-surface-yellow">{currentUserStreak}d 🔥</span>
          <span className="text-white flex items-center gap-1">
            <HexCoinIcon className="w-3.5 h-3.5" />
            {currentUserXp.toLocaleString()} XP
          </span>
        </div>
      </div>
    </div>
  );
}
