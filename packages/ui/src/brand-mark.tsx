import * as React from 'react';
import { cn } from './utils';

export interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly name?: string;
  readonly iconSrc?: string;
}

export function BrandMark({
  name = 'BodhAI',
  iconSrc = '/icons/image.png',
  className,
  ...props
}: BrandMarkProps): React.JSX.Element {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-2.5 select-none', className)}
      {...props}
    >
      <span
        className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-ink bg-surface-white dark:bg-card overflow-hidden shadow-xs shrink-0"
        aria-hidden="true"
      >
        <img
          src={iconSrc}
          alt={name}
          width={40}
          height={40}
          className="h-full w-full object-contain select-none"
        />
      </span>
      <span
        className="font-serif text-[22px] font-black tracking-tight text-ink dark:text-white sm:text-2xl"
        aria-hidden="true"
      >
        BodhAI
      </span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
