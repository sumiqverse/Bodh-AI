'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { SquirrelAvatar } from './MascotIcons';

export type CompanionMood = 'idle' | 'thinking' | 'celebrating' | 'encouraging';

interface StudyCompanionProps {
  mood: CompanionMood;
  hintLevel?: number;
}

export function StudyCompanion({ mood, hintLevel = 0 }: StudyCompanionProps): React.JSX.Element {
  const locale = useLocale();
  const isHindi = locale === 'hi';
  const message = {
    idle: isHindi ? 'चलो, साथ में हल करें!' : "Let's solve this together!",
    thinking: isHindi
      ? `संकेत ${hintLevel} देखो और एक बार फिर सोचो।`
      : `Try hint ${hintLevel}, then give it another go.`,
    celebrating: isHindi ? 'शानदार! तुम्हारी मेहनत रंग लाई!' : 'Nice work! Your effort paid off!',
    encouraging: isHindi
      ? 'कोई बात नहीं। समझाने वाला भाग पढ़ो और फिर कोशिश करो।'
      : 'That is okay. Read the explanation and try again.',
  }[mood];

  return (
    <aside
      className="companion-panel flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface-cream px-3 py-2 shadow-xs"
      aria-label={isHindi ? 'अध्ययन साथी' : 'Study companion'}
    >
      <SquirrelAvatar mood={mood} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-primary-orange">
          {isHindi ? 'तुम्हारा अध्ययन साथी' : 'Your study companion'}
        </p>
        <p className="text-sm font-bold text-ink" aria-live="polite">
          {message}
        </p>
      </div>
    </aside>
  );
}
