'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Award,
  HelpCircle,
  User,
  Settings,
  LifeBuoy,
  LogOut,
} from 'lucide-react';
import { clearAuthSession } from '@/lib/api-client';
import { useRouter } from '@/i18n/routing';

interface StudentSidebarProps {
  studentName?: string;
  roleCaption?: string;
  avatarUrl?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function StudentSidebar({
  studentName = 'Karan Mehra',
  roleCaption = 'Student • Trainee',
  activeTab = 'dashboard',
  onSelectTab,
}: StudentSidebarProps): React.JSX.Element {
  const router = useRouter();

  const handleSignOut = () => {
    clearAuthSession();
    router.push('/login');
  };

  const navLearning = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/student' },
    { id: 'learning', label: 'My Learning', icon: BookOpen, href: '/student' },
    { id: 'achievements', label: 'Achievements', icon: Trophy, href: '/profile' },
    { id: 'certifications', label: 'Certifications', icon: Award, href: '/profile' },
    { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, href: '/diagnostic' },
  ];

  const navAccount = [
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/profile' },
    { id: 'support', label: 'Support', icon: LifeBuoy, href: '/contact' },
  ];

  return (
    <aside
      className="w-full lg:w-[230px] shrink-0 flex flex-col justify-between py-6 px-4 select-none"
      aria-label="Student Navigation Sidebar"
    >
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start gap-2.5 px-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-orange text-white font-devanagari font-black text-xl border-2 border-ink shadow-sm shrink-0 select-none"
            aria-hidden="true"
          >
            बो
          </span>
          <span className="font-serif font-black text-2xl tracking-tight text-ink dark:text-white">
            BodhAI
          </span>
        </div>

        {/* Profile Block */}
        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-surface-cream/50 dark:bg-card border-2 border-ink/10">
          <div className="relative mb-2">
            <div className="h-16 w-16 rounded-full border-2 border-ink overflow-hidden bg-surface-peach flex items-center justify-center text-2xl font-bold text-ink">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-ink" />
          </div>
          <h2 className="font-bold text-base tracking-wide text-ink dark:text-white">
            {studentName}
          </h2>
          <span className="text-xs text-text-secondary dark:text-muted-foreground">
            {roleCaption}
          </span>
        </div>

        {/* Section: LEARNING */}
        <div className="space-y-1">
          <div className="px-3 pb-1 border-b border-divider/60 mb-2">
            <span className="text-[11px] font-bold text-text-secondary dark:text-muted-foreground uppercase tracking-wider">
              LEARNING
            </span>
          </div>

          <nav className="space-y-1" aria-label="Learning Menu">
            {navLearning.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (onSelectTab) onSelectTab(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-cream text-ink font-bold border-2 border-ink shadow-xs'
                      : 'text-text-secondary dark:text-muted-foreground hover:bg-surface-cream/40 hover:text-ink font-medium'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-ink' : 'text-text-secondary'}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section: ACCOUNT */}
        <div className="space-y-1">
          <div className="px-3 pb-1 border-b border-divider/60 mb-2">
            <span className="text-[11px] font-bold text-text-secondary dark:text-muted-foreground uppercase tracking-wider">
              ACCOUNT
            </span>
          </div>

          <nav className="space-y-1" aria-label="Account Menu">
            {navAccount.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-cream text-ink font-bold border-2 border-ink shadow-xs'
                      : 'text-text-secondary dark:text-muted-foreground hover:bg-surface-cream/40 hover:text-ink font-medium'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-text-secondary" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Pinned Bottom: Sign Out */}
      <div className="pt-6 border-t border-divider mt-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-ink dark:text-white hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-5 w-5 text-destructive shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
