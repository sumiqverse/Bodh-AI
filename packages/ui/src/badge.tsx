import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  const baseStyles =
    'inline-flex items-center font-bold rounded-full transition-colors select-none';

  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-surface-cream text-ink border-2 border-ink shadow-xs',
    secondary: 'bg-surface-blue text-ink border-2 border-ink shadow-xs',
    outline: 'border-2 border-ink text-ink bg-surface-white dark:bg-card dark:text-white shadow-xs',
    success: 'bg-emerald-100 text-emerald-950 border-2 border-ink shadow-xs',
    warning: 'bg-surface-yellow text-ink border-2 border-ink shadow-xs',
    destructive: 'bg-surface-pink text-ink border-2 border-ink shadow-xs',
  };

  const sizes: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
