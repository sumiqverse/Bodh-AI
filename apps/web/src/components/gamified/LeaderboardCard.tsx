'use client';

import * as React from 'react';
import { SquirrelWithTrophy } from './MascotIcons';

export interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  streakDays: number;
  avatarBg: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
  topThree?: LeaderboardUser[];
  listLearners?: LeaderboardUser[];
  currentUserRow?: LeaderboardUser;
  loading?: boolean;
  error?: boolean;
}

export function LeaderboardCard({
  topThree = [],
  listLearners = [],
  currentUserRow,
  loading,
  error,
}: LeaderboardCardProps): React.JSX.Element {
  const learners = [...topThree, ...listLearners];
  return (
    <section className="rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-ink dark:text-white">Class leaderboard</h3>
          <p className="text-xs text-text-secondary mt-0.5">Ranked by total earned XP</p>
        </div>
        <SquirrelWithTrophy className="w-12 h-12 shrink-0" />
      </div>
      {loading ? (
        <p>Loading leaderboard…</p>
      ) : error ? (
        <p>Could not load the leaderboard. Please try again.</p>
      ) : learners.length === 0 ? (
        <p className="text-sm">Join an approved classroom to see its leaderboard.</p>
      ) : (
        <div className="space-y-2">
          {learners.map((learner) => (
            <div
              key={learner.rank}
              className="flex items-center justify-between gap-2 rounded-full border-2 border-ink px-3 py-2 text-xs"
            >
              <span className="font-bold truncate">
                #{learner.rank} {learner.name}
                {learner.isCurrentUser ? ' (you)' : ''}
              </span>
              <span className="shrink-0 font-bold">{learner.xp.toLocaleString()} XP</span>
            </div>
          ))}
          {currentUserRow && currentUserRow.rank > 6 && (
            <div className="rounded-full bg-ink px-3 py-2 text-xs font-bold text-white">
              #{currentUserRow.rank} {currentUserRow.name} · {currentUserRow.xp.toLocaleString()} XP
            </div>
          )}
        </div>
      )}
    </section>
  );
}
