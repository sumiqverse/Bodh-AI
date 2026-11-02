'use client';

import * as React from 'react';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider">
      {/* Left: Page Title & Classroom switcher */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">{pageTitle}</h1>

        {enrolledClasses.length > 1 && (
          <select
            aria-label="Select Enrolled Classroom"
            value={selectedClass?.classId}
            onChange={(e) => onSelectClass && onSelectClass(e.target.value)}
            className="rounded-full border-2 border-ink bg-surface-cream px-3 py-1 text-xs font-bold text-ink shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-orange cursor-pointer"
          >
            {enrolledClasses.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                {cls.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right Controls: Search Pill, Notification Bell, Dark-Mode Toggle */}
      <div className="flex items-center gap-3">
        {/* Search Pill */}
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search something..."
            className="w-full h-10 pl-10 pr-4 rounded-full border-2 border-ink bg-surface-white dark:bg-card text-xs font-medium text-ink dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-orange transition-all"
          />
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative h-10 w-10 flex items-center justify-center rounded-full border-2 border-ink bg-surface-white dark:bg-card text-ink dark:text-white hover:bg-surface-cream transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary-orange" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          aria-label="Toggle Dark Mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-ink bg-surface-white dark:bg-card text-ink dark:text-white hover:bg-surface-cream transition-colors cursor-pointer"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
