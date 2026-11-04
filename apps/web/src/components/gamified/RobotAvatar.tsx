'use client';

import Image from 'next/image';
import type { CompanionMood } from './FloatingStudyPet';

const robotImages: Record<CompanionMood, string> = {
  idle: '/pet/robot-idle.png',
  thinking: '/pet/robot-thinking.png',
  celebrating: '/pet/robot-celebrating.png',
  encouraging: '/pet/robot-encouraging.png',
};

export function RobotAvatar({
  mood = 'idle',
  className = '',
}: {
  mood?: CompanionMood;
  className?: string;
}) {
  return (
    <span className={`robot-pet robot-pet--${mood} relative inline-block ${className}`}>
      <Image
        src={robotImages[mood]}
        alt={`Study robot ${mood}`}
        fill
        sizes="(max-width: 640px) 112px, 160px"
        className="object-contain drop-shadow-lg"
        priority={mood === 'idle'}
      />
    </span>
  );
}
