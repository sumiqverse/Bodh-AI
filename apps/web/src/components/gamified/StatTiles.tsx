'use client';

import * as React from 'react';
import { HexCoinIcon, LevelDiamondIcon, StreakFlameIcon, PodiumStarIcon } from './MascotIcons';

interface StatTilesProps {
  xp?: number;
  levelTitle?: string;
  streakDays?: number;
  rank?: number;
}

export function StatTiles({
  xp = 1320,
  levelTitle = 'Trainee',
  streakDays = 9,
  rank = 10,
}: StatTilesProps): React.JSX.Element {
  const tiles = [
    {
      id: 'xp',
      value: `${xp.toLocaleString()} XP`,
      label: 'Current XP',
      bgClass: 'bg-surface-cream',
      icon: <HexCoinIcon className="w-14 h-14 -mr-1 -mb-1" />,
    },
    {
      id: 'level',
      value: levelTitle,
      label: 'Your Level',
      bgClass: 'bg-surface-blue',
      icon: <LevelDiamondIcon className="w-14 h-14 -mr-1 -mb-1" />,
    },
    {
      id: 'streak',
      value: `${streakDays} Days`,
      label: 'Streak',
      bgClass: 'bg-surface-yellow',
      icon: <StreakFlameIcon className="w-14 h-14 -mr-1 -mb-1" />,
    },
    {
      id: 'rank',
      value: `#${rank}`,
      label: 'Rank',
      bgClass: 'bg-surface-pink',
      icon: <PodiumStarIcon className="w-14 h-14 -mr-1 -mb-1" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Student Stats Summary">
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className={`relative overflow-hidden rounded-tile border-2 border-ink ${tile.bgClass} p-3.5 flex flex-col justify-between h-[120px] sm:h-[125px] shadow-card transition-transform hover:-translate-y-0.5`}
        >
          {/* Top Left: Value + Label */}
          <div className="z-10">
            <h3 className="font-extrabold text-lg sm:text-xl text-ink leading-tight">
              {tile.value}
            </h3>
            <span className="text-xs font-medium text-ink/75 block mt-0.5">{tile.label}</span>
          </div>

          {/* Bottom Right: Vector Art Illustration */}
          <div className="absolute right-1 bottom-1 pointer-events-none select-none opacity-90 transition-transform group-hover:scale-105">
            {tile.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
