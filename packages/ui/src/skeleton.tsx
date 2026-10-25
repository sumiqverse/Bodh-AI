import * as React from 'react';
import { cn } from './utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  className,
  rounded = 'md',
  ...props
}: SkeletonProps): React.JSX.Element {
  const roundMap = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn('animate-pulse bg-muted/60', roundMap[rounded], className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
