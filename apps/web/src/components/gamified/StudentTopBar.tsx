'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

interface StudentTopBarProps {
  pageTitle?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedClass?: { classId: string; name: string } | null;
  enrolledClasses?: Array<{ classId: string; name: string }>;
  onSelectClass?: (classId: string) => void;
}

export function StudentTopBar({
  pageTitle = 'Dashboard',
  searchQuery = '',
  onSearchChange,
  selectedClass,
  enrolledClasses = [],
  onSelectClass,
}: StudentTopBarProps): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-divider">
      {/* Left: Page Title & Classroom switcher */}
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">{pageTitle}</h1>

        {enrolledClasses.length > 1 && (
          <select
            aria-label="Select Enrolled Classroom"
            value={selectedClass?.classId}
            onChange={(e) => onSelectClass && onSelectClass(e.target.value)}
            className="min-w-0 max-w-full min-h-11 rounded-full border-2 border-ink bg-surface-cream px-3 py-1 text-xs font-bold text-ink shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-orange cursor-pointer"
          >
            {enrolledClasses.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                {cls.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right Controls: Search Pill */}
      <div className="flex min-w-0 w-full items-center">
        {/* Search Pill */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="search"
            aria-label="Search learning content"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search something..."
            className="w-full h-10 pl-10 pr-4 rounded-full border-2 border-ink bg-surface-white dark:bg-card text-xs font-medium text-ink dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-orange transition-all"
          />
        </div>
      </div>
    </header>
  );
}
