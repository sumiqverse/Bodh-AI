'use client';

import * as React from 'react';

/**
 * Gamified Mascot & Vector Illustrations
 * Neo-brutalist-lite style with bold 2px ink outlines (#1A1A1A) and warm pastel fills.
 * Spec from design.md: Squirrel mascot, Hex Coin, Level Diamond, Streak Flame, Podium Star, Puzzle Art.
 */

// 1. Squirrel Mascot - Greeting Pose (Cheering with fluffy tail)
export function SquirrelAvatar({
  className = 'w-12 h-12',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Squirrel mascot cheering"
    >
      {/* Background circle accent */}
      <circle cx="50" cy="50" r="46" fill="#FDEFC3" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Fluffy tail curved behind */}
      <path
        d="M62 76C68 76 84 70 86 52C88 34 76 22 66 18C61 16 57 18 56 21C55 24 57 28 62 30C70 34 74 44 72 54C70 64 64 68 58 70"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M66 28C72 32 76 40 74 48" stroke="#FFD966" strokeWidth="2" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="46" cy="62" rx="20" ry="22" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Cream Belly */}
      <ellipse cx="43" cy="64" rx="12" ry="15" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="2" />
      {/* Left Ear */}
      <path
        d="M32 30C30 20 36 16 40 22C42 25 40 30 38 34"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="36" cy="24" rx="3" ry="5" fill="#F9B9B9" />
      {/* Right Ear */}
      <path
        d="M48 28C50 18 56 16 59 22C61 26 58 31 54 34"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="54" cy="24" rx="3" ry="5" fill="#F9B9B9" />
      {/* Head */}
      <ellipse cx="44" cy="40" rx="18" ry="16" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Cheeks */}
      <ellipse cx="33" cy="44" rx="6" ry="6" fill="#FDD9B5" stroke="#1A1A1A" strokeWidth="1.5" />
      <ellipse cx="53" cy="44" rx="6" ry="6" fill="#FDD9B5" stroke="#1A1A1A" strokeWidth="1.5" />
      <circle cx="33" cy="44" r="2.5" fill="#F9B9B9" />
      <circle cx="53" cy="44" r="2.5" fill="#F9B9B9" />
      {/* Big Eyes */}
      <ellipse cx="38" cy="37" rx="3.5" ry="4.5" fill="#1A1A1A" />
      <circle cx="37" cy="35.5" r="1.5" fill="#FFFFFF" />
      <ellipse cx="48" cy="37" rx="3.5" ry="4.5" fill="#1A1A1A" />
      <circle cx="47" cy="35.5" r="1.5" fill="#FFFFFF" />
      {/* Snout & Little Nose */}
      <ellipse cx="43" cy="42" rx="4" ry="3" fill="#FFF4B5" />
      <polygon points="41.5,41 44.5,41 43,43" fill="#1A1A1A" />
      <path
        d="M43 43C42 45 40 45 39 44M43 43C44 45 46 45 47 44"
        stroke="#1A1A1A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Small paws */}
      <ellipse cx="36" cy="62" rx="4" ry="3" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="2" />
      <ellipse cx="48" cy="62" rx="4" ry="3" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="2" />
    </svg>
  );
}

// 2. Squirrel with Clock (Today's Challenge - Urgency/Timer pose)
export function SquirrelWithClock({
  className = 'w-16 h-16',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 110 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Squirrel holding clock"
    >
      {/* Tail */}
      <path
        d="M32 75C24 75 10 68 8 50C6 32 18 20 28 16C33 14 37 16 38 19C39 22 37 26 32 28C24 32 20 42 22 52C24 62 30 66 36 68"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Squirrel Body */}
      <ellipse cx="48" cy="60" rx="18" ry="20" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Head */}
      <ellipse cx="46" cy="38" rx="16" ry="15" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Ears */}
      <path d="M36 28C34 18 40 15 43 21" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2" />
      <path d="M50 26C52 16 58 15 60 21" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2" />
      {/* Face */}
      <ellipse cx="42" cy="35" rx="3" ry="4" fill="#1A1A1A" />
      <circle cx="41" cy="33.5" r="1.2" fill="#FFFFFF" />
      <ellipse cx="50" cy="35" rx="3" ry="4" fill="#1A1A1A" />
      <circle cx="49" cy="33.5" r="1.2" fill="#FFFFFF" />
      <ellipse cx="46" cy="40" rx="3" ry="2" fill="#FFF4B5" />
      <polygon points="45,39 47,39 46,41" fill="#1A1A1A" />
      {/* Clock held in hands */}
      <g transform="translate(62, 42)">
        {/* Clock top bell ring */}
        <path d="M14 6C14 2 22 2 22 6" stroke="#1A1A1A" strokeWidth="2" />
        <circle cx="18" cy="20" r="18" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="2.5" />
        <circle cx="18" cy="20" r="14" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.5" />
        {/* Clock Hands */}
        <line
          x1="18"
          y1="20"
          x2="18"
          y2="12"
          stroke="#E8800A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="18"
          y1="20"
          x2="24"
          y2="20"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="20" r="2" fill="#E8800A" />
        {/* Clock tick marks */}
        <line x1="18" y1="8" x2="18" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        <line x1="28" y1="20" x2="30" y2="20" stroke="#1A1A1A" strokeWidth="1.5" />
      </g>
      {/* Arms holding clock */}
      <path d="M42 56C50 56 62 52 64 54" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="64" cy="54" rx="3" ry="2.5" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="1.5" />
    </svg>
  );
}

// 3. Squirrel Holding Trophy (Leaderboard Header)
export function SquirrelWithTrophy({
  className = 'w-16 h-16',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Squirrel holding golden trophy"
    >
      {/* Tail */}
      <path
        d="M28 72C20 72 8 64 6 48C4 32 16 20 26 16C31 14 35 16 36 19C37 22 35 26 30 28C22 32 18 42 20 52C22 62 26 66 32 68"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Body */}
      <ellipse cx="44" cy="62" rx="16" ry="18" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      <ellipse cx="42" cy="64" rx="10" ry="12" fill="#FFF4B5" stroke="#1A1A1A" strokeWidth="1.5" />
      {/* Head */}
      <ellipse cx="42" cy="40" rx="15" ry="14" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2.5" />
      {/* Ears */}
      <path d="M32 30C30 20 36 17 39 23" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2" />
      <path d="M46 28C48 18 54 17 56 23" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2" />
      {/* Cheerful Eyes (happy arcs) */}
      <path d="M36 38C37 36 40 36 41 38" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 38C46 36 49 36 50 38" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="42,41 45,41 43.5,43" fill="#1A1A1A" />
      {/* Golden Trophy */}
      <g transform="translate(56, 26)">
        {/* Trophy cup body */}
        <path
          d="M6 4H26C26 4 28 16 22 24C18 28 14 28 10 24C4 16 6 4 6 4Z"
          fill="#FFD966"
          stroke="#1A1A1A"
          strokeWidth="2"
        />
        {/* Trophy stem */}
        <rect
          x="14"
          y="24"
          width="4"
          height="8"
          fill="#F39C12"
          stroke="#1A1A1A"
          strokeWidth="1.5"
        />
        {/* Trophy base */}
        <rect
          x="10"
          y="32"
          width="12"
          height="6"
          rx="2"
          fill="#8B4A14"
          stroke="#1A1A1A"
          strokeWidth="1.5"
        />
        {/* Trophy handles */}
        <path
          d="M6 8C2 8 2 16 6 18"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M26 8C30 8 30 16 26 18"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Star in cup */}
        <polygon
          points="16,8 17.5,12 21,12 18,14.5 19,18 16,15.5 13,18 14,14.5 11,12 14.5,12"
          fill="#E8800A"
        />
      </g>
    </svg>
  );
}

// 4. Gold Hex Coin (XP Tile)
export function HexCoinIcon({
  className = 'w-10 h-10',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Gold XP Hex Coin"
    >
      {/* Outer Hexagon */}
      <polygon
        points="30,4 52,16 52,44 30,56 8,44 8,16"
        fill="#FFD966"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Inner Hexagon Rim */}
      <polygon
        points="30,9 47,19 47,41 30,51 13,41 13,19"
        fill="#FDEFC3"
        stroke="#D9A21B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* XP Bold Text */}
      <text
        x="30"
        y="35"
        textAnchor="middle"
        fill="#1A1A1A"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.5"
      >
        XP
      </text>
    </svg>
  );
}

// 5. Level Diamond (Your Level Tile - Trainee)
export function LevelDiamondIcon({
  className = 'w-10 h-10',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Level Diamond"
    >
      {/* Diamond faceted gem */}
      <polygon
        points="30,6 54,22 30,54 6,22"
        fill="#93C5FD"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Top crown facets */}
      <polygon points="18,22 30,6 42,22" fill="#BFDBFE" stroke="#1A1A1A" strokeWidth="1.5" />
      <polygon points="6,22 18,22 30,6" fill="#DBEAFE" stroke="#1A1A1A" strokeWidth="1.5" />
      <polygon points="42,22 54,22 30,6" fill="#60A5FA" stroke="#1A1A1A" strokeWidth="1.5" />
      {/* Bottom pavilion facets */}
      <polygon points="18,22 30,54 30,22" fill="#3B82F6" stroke="#1A1A1A" strokeWidth="1.5" />
      <polygon points="30,22 30,54 42,22" fill="#2563EB" stroke="#1A1A1A" strokeWidth="1.5" />
      <polygon points="6,22 18,22 30,54" fill="#60A5FA" stroke="#1A1A1A" strokeWidth="1.5" />
      <polygon points="42,22 54,22 30,54" fill="#1D4ED8" stroke="#1A1A1A" strokeWidth="1.5" />
    </svg>
  );
}

// 6. Streak Flame (Streak Tile - 9 Days)
export function StreakFlameIcon({
  className = 'w-10 h-10',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Streak Flame"
    >
      {/* Outer Flame */}
      <path
        d="M30 4C30 4 38 16 38 24C38 27 42 28 44 26C48 32 50 38 50 44C50 52 42 56 30 56C18 56 10 52 10 44C10 32 20 20 26 14C27 20 31 22 32 20C34 16 30 4 30 4Z"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Mid Flame Core */}
      <path
        d="M30 18C30 18 36 26 36 32C36 35 39 36 40 34C43 38 43 43 42 47C40 52 35 54 30 54C22 54 18 50 18 44C18 35 24 27 28 22C28 26 31 27 32 25C33 22 30 18 30 18Z"
        fill="#F39C12"
      />
      {/* Inner Yellow Heart */}
      <path
        d="M30 30C30 30 34 36 34 40C34 42 36 43 37 42C38 45 37 48 35 50C33 52 31 52 30 52C26 52 24 49 24 46C24 40 28 35 30 30Z"
        fill="#FFD966"
      />
    </svg>
  );
}

// 7. Podium with Star (Rank Tile - #10)
export function PodiumStarIcon({
  className = 'w-10 h-10',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Podium with Star"
    >
      {/* Center 1st podium block */}
      <rect
        x="22"
        y="24"
        width="16"
        height="30"
        rx="3"
        fill="#E8800A"
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* Left 2nd podium block */}
      <rect
        x="6"
        y="32"
        width="16"
        height="22"
        rx="3"
        fill="#F9B9B9"
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* Right 3rd podium block */}
      <rect
        x="38"
        y="38"
        width="16"
        height="16"
        rx="3"
        fill="#FDEFC3"
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* Golden Star at the top of 1st */}
      <polygon
        points="30,6 32.5,13 40,13 34,18 36,25 30,20.5 24,25 26,18 20,13 27.5,13"
        fill="#FFD966"
        stroke="#1A1A1A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 8. Interlocking Puzzle Art (Today's Challenge graphic)
export function PuzzlePiecesArt({
  className = 'w-16 h-16',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Puzzle pieces"
    >
      {/* Top Left Piece (Cream) */}
      <path
        d="M10 10H38C38 18 46 18 46 10H50V38C42 38 42 46 50 46V50H22C22 14 10 22 10 10Z"
        fill="#FDEFC3"
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* Top Right Piece (Soft Blue) */}
      <path
        d="M50 10H70V38C62 38 62 46 70 46V50H46C46 42 38 42 38 50H30V38C38 38 38 30 30 30V10H50Z"
        fill="#DCE8FB"
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* Bottom Orange Piece */}
      <circle cx="56" cy="56" r="14" fill="#E8800A" stroke="#1A1A1A" strokeWidth="2" />
      <polygon
        points="56,48 58,53 64,53 59,57 61,63 56,59 51,63 53,57 48,53 54,53"
        fill="#FFD966"
        stroke="#1A1A1A"
        strokeWidth="1"
      />
    </svg>
  );
}

// 9. Efficiency Donut Chart (73% with 3 orange tints)
export function EfficiencyDonut({
  percentage = 73,
  className = 'w-24 h-24',
}: {
  percentage?: number;
  className?: string;
}): React.JSX.Element {
  // SVG circular arc math for 73%
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Track 1: Light Peach background (Incomplete tasks) */}
        <circle cx="50" cy="50" r={radius} stroke="#FEEBCF" strokeWidth="12" fill="transparent" />
        {/* Segment 2: Soft Amber (Active Learning) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#FFD966"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.15}
          fill="transparent"
          strokeLinecap="round"
        />
        {/* Segment 3: Primary Orange (Quiz Accuracy - 73%) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#E8800A"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          strokeLinecap="round"
        />
      </svg>
      {/* Central Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-ink dark:text-white leading-none">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
