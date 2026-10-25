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
    'inline-flex items-center font-medium rounded-full transition-colors select-none';

  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default:
      'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    outline: 'border border-border text-foreground bg-transparent',
    success:
      'bg-success/10 text-success border border-success/20 dark:bg-success/20 dark:text-success',
    warning:
      'bg-warning/10 text-warning border border-warning/20 dark:bg-warning/20 dark:text-warning',
    destructive:
      'bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:text-destructive',
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
