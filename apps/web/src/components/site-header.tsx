'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { Navbar } from '@bodhai/ui';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import {
  getCurrentUser,
  clearAuthSession,
  getUserDashboardPath,
  syncSessionCookies,
  getAuthToken,
} from '@/lib/api-client';
import type { UserResponse } from '@bodhai/api-client';
import {
  Settings,
  User,
  LogOut,
  ChevronDown,
  BookOpen,
  Users,
  Shield,
  GraduationCap,
  LogIn,
  UserPlus,
} from 'lucide-react';

export function SiteHeader(): React.JSX.Element {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale() as 'en' | 'hi';

  const [currentUser, setCurrentUser] = React.useState<UserResponse | null>(null);
  const [userAvatar, setUserAvatar] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState<boolean>(false);

  // Sync auth state and profile photo on mount, route change, or custom events
  React.useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      if (user) {
        syncSessionCookies(getAuthToken(), user);
      }
      if (user && typeof window !== 'undefined') {
        try {
          const pRaw = localStorage.getItem(`bodhai_profile_${user.id || user.email || ''}`);
          if (pRaw) {
            const p = JSON.parse(pRaw);
            if (p.avatarUrl) {
              setUserAvatar(p.avatarUrl);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      setUserAvatar(null);
    };

    syncUser();

    window.addEventListener('storage', syncUser);
    window.addEventListener('bodhai_auth_change', syncUser);
    window.addEventListener('bodhai_profile_updated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('bodhai_auth_change', syncUser);
      window.removeEventListener('bodhai_profile_updated', syncUser);
    };
  }, [pathname]);

  const handleSignOut = () => {
    clearAuthSession();
    setCurrentUser(null);
    setUserAvatar(null);
    router.push('/');
  };

  const navItems = React.useMemo(() => {
    if (mounted && currentUser) {
      if (currentUser.role === 'student') {
        return [
          {
            label: currentLocale === 'hi' ? 'मेरी कक्षाएं (होम)' : 'My Classrooms (Home)',
            href: '/student',
            isActive: pathname === '/student',
          },
          {
            label: currentLocale === 'hi' ? 'निदान परीक्षा' : 'Diagnostic',
            href: '/diagnostic',
            isActive: pathname === '/diagnostic',
          },
          {
            label: currentLocale === 'hi' ? 'प्रगति' : 'Progress',
            href: '/progress',
            isActive: pathname === '/progress',
          },
          {
            label: tNav('languages'),
            href: '/languages-offline',
            isActive: pathname === '/languages-offline',
          },
        ];
      }

      if (currentUser.role === 'teacher') {
        return [
          {
            label: currentLocale === 'hi' ? 'शिक्षक डैशबोर्ड एवं हीटमैप' : 'Classroom Heatmap',
            href: '/classes',
            isActive: pathname.startsWith('/classes'),
          },
          {
            label: tNav('students'),
            href: '/for-students',
            isActive: pathname === '/for-students',
          },
          {
            label: tNav('howItWorks'),
            href: '/how-it-works',
            isActive: pathname === '/how-it-works',
          },
          {
            label: tNav('contact'),
            href: '/contact',
            isActive: pathname === '/contact',
          },
        ];
      }

      if (currentUser.role === 'admin') {
        return [
          {
            label: 'Stats',
            href: '/admin/stats',
            isActive: pathname === '/admin/stats',
          },
          {
            label: 'Skill Graph',
            href: '/admin/skill-graph',
            isActive: pathname === '/admin/skill-graph',
          },
          {
            label: 'Question Editor',
            href: '/admin/questions',
            isActive: pathname === '/admin/questions',
          },
          {
            label: 'Review Queue',
            href: '/admin/review-queue',
            isActive: pathname === '/admin/review-queue',
          },
          {
            label: 'Content Import',
            href: '/admin/import',
            isActive: pathname === '/admin/import',
          },
          {
            label: 'Audit Logs',
            href: '/admin/audit-logs',
            isActive: pathname === '/admin/audit-logs',
          },
        ];
      }
    }

    // Public website visitors
    return [
      {
        label: tNav('howItWorks'),
        href: '/how-it-works',
        isActive: pathname === '/how-it-works',
      },
      {
        label: tNav('students'),
        href: '/for-students',
        isActive: pathname === '/for-students',
      },
      {
        label: tNav('teachers'),
        href: '/for-teachers',
        isActive: pathname === '/for-teachers',
      },
      {
        label: tNav('schools'),
        href: '/for-schools',
        isActive: pathname === '/for-schools',
      },
      {
        label: tNav('contact'),
        href: '/contact',
        isActive: pathname === '/contact',
      },
    ];
  }, [currentUser, currentLocale, mounted, pathname, tNav]);

  const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastUserHoverTimeRef = React.useRef<number>(0);

  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = React.useState<boolean>(false);
  const authDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const authDropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastAuthHoverTimeRef = React.useRef<number>(0);

  const handleDropdownEnter = () => {
    lastUserHoverTimeRef.current = Date.now();
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  const handleUserButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    const timeSinceHover = Date.now() - lastUserHoverTimeRef.current;
    if (timeSinceHover < 600 && isDropdownOpen) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  };

  const handleAuthDropdownEnter = () => {
    lastAuthHoverTimeRef.current = Date.now();
    if (authDropdownTimeoutRef.current) {
      clearTimeout(authDropdownTimeoutRef.current);
      authDropdownTimeoutRef.current = null;
    }
    setIsAuthDropdownOpen(true);
  };

  const handleAuthDropdownLeave = () => {
    authDropdownTimeoutRef.current = setTimeout(() => {
      setIsAuthDropdownOpen(false);
    }, 200);
  };

  const handleAuthButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authDropdownTimeoutRef.current) {
      clearTimeout(authDropdownTimeoutRef.current);
      authDropdownTimeoutRef.current = null;
    }
    // Clicking CTA button ensures dropdown is open and stays open
    setIsAuthDropdownOpen(true);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (authDropdownRef.current && !authDropdownRef.current.contains(event.target as Node)) {
        setIsAuthDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsAuthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
      if (authDropdownTimeoutRef.current) {
        clearTimeout(authDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown on route change
  React.useEffect(() => {
    setIsDropdownOpen(false);
    setIsAuthDropdownOpen(false);
  }, [pathname]);

  const brandHref = currentUser ? getUserDashboardPath(currentUser) : '/';

  const displayName =
    currentUser?.full_name ||
    currentUser?.username ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
    'User';

  const userRole = currentUser?.role || 'student';
  const roleBadgeText =
    userRole === 'student'
      ? currentLocale === 'hi'
        ? 'छात्र'
        : 'Student'
      : userRole === 'teacher'
        ? currentLocale === 'hi'
          ? 'शिक्षक'
          : 'Teacher'
        : userRole === 'admin'
          ? currentLocale === 'hi'
            ? 'एडमिन'
            : 'Admin'
          : userRole;

  // Primary workspace / dashboard link based on role
  const primaryWorkspace = React.useMemo(() => {
    if (userRole === 'student') {
      return {
        label: currentLocale === 'hi' ? 'मेरी कक्षाएं (Dashboard)' : 'My Classrooms',
        desc: currentLocale === 'hi' ? 'लर्निंग पोर्टल एवं एनसीईआरटी' : 'NCERT Learning Portal',
        href: '/student',
        icon: <GraduationCap className="w-4 h-4 text-ink" />,
        isActive: pathname.startsWith('/student'),
      };
    }
    if (userRole === 'teacher') {
      return {
        label: tNav.has('classes')
          ? tNav('classes')
          : currentLocale === 'hi'
            ? 'मेरी कक्षाएँ'
            : 'My Classes',
        desc: currentLocale === 'hi' ? 'क्लासरूम हीटमैप व टूल्स' : 'Classroom Heatmap & Tools',
        href: '/classes',
        icon: <Users className="w-4 h-4 text-ink" />,
        isActive: pathname.startsWith('/classes'),
      };
    }
    if (userRole === 'admin') {
      return {
        label: currentLocale === 'hi' ? 'एडमिन एनालिटिक्स' : 'Admin Portal',
        desc: currentLocale === 'hi' ? 'स्कूल मैट्रिक्स व कंट्रोल्स' : 'School Analytics & Tools',
        href: '/admin/stats',
        icon: <Shield className="w-4 h-4 text-ink" />,
        isActive: pathname.startsWith('/admin'),
      };
    }
    return {
      label: 'Dashboard',
      desc: 'Overview',
      href: '/',
      icon: <BookOpen className="w-4 h-4 text-ink" />,
      isActive: false,
    };
  }, [userRole, currentLocale, tNav, pathname]);

  return (
    <Navbar
      suppressHydrationWarning
      className="sticky top-0 z-40 w-full border-b-2 border-ink bg-surface-white/95 dark:bg-background/95 backdrop-blur-md"
      brandName={tCommon('brand')}
      brandHref={brandHref}
      items={navItems}
      linkComponent={Link}
      languageSwitcher={<LanguageSwitcher />}
      themeToggle={<ThemeToggle label={tCommon('theme')} />}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {mounted && currentUser ? (
            /* ============================================================== */
            /* UNIFIED USER SECTION: Profile Pill with Hover & Click Dropdown */
            /* ============================================================== */
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                onClick={handleUserButtonClick}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                className={`group flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border-2 border-ink transition-all cursor-pointer select-none ${
                  isDropdownOpen
                    ? 'bg-surface-cream text-ink shadow-xs translate-y-0.5'
                    : 'bg-surface-white dark:bg-card text-ink dark:text-white shadow-xs hover:bg-surface-cream hover:-translate-y-0.5'
                }`}
              >
                {/* Avatar Badge */}
                <div className="relative w-7 h-7 rounded-full border-2 border-ink overflow-hidden shrink-0 bg-primary-orange text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(displayName ? displayName.charAt(0) : 'U').toUpperCase()}</span>
                  )}
                </div>

                {/* Display Name & Role Pill */}
                <div className="flex items-center gap-1.5 text-left">
                  <span className="font-extrabold text-xs sm:text-sm text-ink dark:text-white max-w-[90px] sm:max-w-[130px] truncate leading-none">
                    {displayName}
                  </span>
                  <span className="hidden sm:inline-flex text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-ink/40 bg-surface-yellow text-ink leading-none">
                    {roleBadgeText}
                  </span>
                </div>

                {/* Animated Rotating Chevron */}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-ink dark:text-white transition-transform duration-200 shrink-0 ${
                    isDropdownOpen
                      ? 'rotate-180 text-primary-orange'
                      : 'group-hover:translate-y-0.5'
                  }`}
                />
              </button>

              {/* Neo-Brutalist Dropdown Card on Hover / Click */}
              {isDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border-2 border-ink bg-surface-white dark:bg-[#1A1D24] p-2.5 shadow-shell z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  {/* Dropdown Header: User Info */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-cream/60 dark:bg-card/70 border border-ink/15 mb-2">
                    <div className="w-9 h-9 rounded-full border-2 border-ink overflow-hidden shrink-0 bg-primary-orange text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(displayName ? displayName.charAt(0) : 'U').toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs text-ink dark:text-white truncate leading-snug">
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black text-ink bg-surface-yellow border border-ink/30 px-1.5 py-0.2 rounded-full uppercase leading-none">
                          {roleBadgeText}
                        </span>
                        {currentUser?.email && (
                          <span className="text-[10px] text-text-secondary dark:text-muted-foreground truncate leading-none">
                            {currentUser.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-ink/20 my-1.5" />

                  {/* Dropdown Navigation Links */}
                  <div className="space-y-1">
                    {/* 1. Primary Classrooms / Dashboard */}
                    <Link
                      href={primaryWorkspace.href}
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                        primaryWorkspace.isActive
                          ? 'bg-surface-cream border-2 border-ink text-ink font-bold shadow-xs'
                          : 'border-transparent text-ink dark:text-white hover:bg-surface-cream/60 hover:border-ink/20'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg border border-ink bg-surface-yellow flex items-center justify-center text-ink shrink-0 shadow-xs">
                        {primaryWorkspace.icon}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-bold text-xs truncate leading-snug">
                          {primaryWorkspace.label}
                        </p>
                        <p className="text-[10px] text-text-secondary dark:text-muted-foreground truncate">
                          {primaryWorkspace.desc}
                        </p>
                      </div>
                    </Link>

                    {/* 2. My Profile */}
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                        pathname === '/profile'
                          ? 'bg-surface-cream border-2 border-ink text-ink font-bold shadow-xs'
                          : 'border-transparent text-ink dark:text-white hover:bg-surface-cream/60 hover:border-ink/20'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg border border-ink bg-surface-peach flex items-center justify-center text-ink shrink-0 shadow-xs">
                        <User className="w-4 h-4 text-ink" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-bold text-xs truncate leading-snug">
                          {tNav.has('myProfile')
                            ? tNav('myProfile')
                            : currentLocale === 'hi'
                              ? 'मेरी प्रोफ़ाइल'
                              : 'My Profile'}
                        </p>
                        <p className="text-[10px] text-text-secondary dark:text-muted-foreground truncate">
                          {currentLocale === 'hi' ? 'खाता व प्रोग्रेस विवरण' : 'Account & History'}
                        </p>
                      </div>
                    </Link>

                    {/* 3. Settings */}
                    <Link
                      href="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                        pathname === '/settings'
                          ? 'bg-surface-cream border-2 border-ink text-ink font-bold shadow-xs'
                          : 'border-transparent text-ink dark:text-white hover:bg-surface-cream/60 hover:border-ink/20'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg border border-ink bg-surface-blue flex items-center justify-center text-ink shrink-0 shadow-xs">
                        <Settings className="w-4 h-4 text-ink" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-bold text-xs truncate leading-snug">
                          {tNav('settings')}
                        </p>
                        <p className="text-[10px] text-text-secondary dark:text-muted-foreground truncate">
                          {currentLocale === 'hi'
                            ? 'प्राथमिकताएं व सिस्टम'
                            : 'Preferences & System'}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="border-t-2 border-dashed border-ink/20 my-1.5" />

                  {/* 4. Sign Out */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-transparent hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-destructive transition-all cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg border border-red-300 bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0 shadow-xs">
                      <LogOut className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs text-destructive truncate">
                        {tNav('signOut')}
                      </p>
                      <p className="text-[10px] text-destructive/80 truncate">
                        {currentLocale === 'hi' ? 'सत्र समाप्त करें' : 'Sign out of BodhAI'}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* GET STARTED CTA: Hover & Click Dropdown for Sign In / Sign Up */
            /* ============================================================== */
            <div
              ref={authDropdownRef}
              onMouseEnter={handleAuthDropdownEnter}
              onMouseLeave={handleAuthDropdownLeave}
              className="relative inline-flex items-center"
            >
              <button
                type="button"
                onClick={handleAuthButtonClick}
                aria-expanded={isAuthDropdownOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink font-black text-xs sm:text-sm px-4 py-1.5 shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer whitespace-nowrap shrink-0 select-none ${
                  isAuthDropdownOpen ? 'bg-primary-orange-dark' : ''
                }`}
              >
                <span>{tCommon('getStarted')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    isAuthDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Neo-Brutalist Dropdown Card on Hover / Click */}
              {isAuthDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-ink bg-surface-white dark:bg-[#1A1D24] p-2.5 shadow-shell z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1.5"
                >
                  {/* Sign In Link */}
                  <Link
                    href="/login"
                    onClick={() => setIsAuthDropdownOpen(false)}
                    className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${
                      pathname === '/login'
                        ? 'border-ink bg-surface-cream text-ink font-bold shadow-xs'
                        : 'border-transparent hover:border-ink hover:bg-surface-cream text-ink dark:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-ink bg-surface-white flex items-center justify-center text-ink shrink-0 shadow-xs">
                      <LogIn className="w-4 h-4 text-ink" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-bold text-xs leading-snug">{tNav('login')}</div>
                      <div className="text-[10px] text-text-secondary dark:text-muted-foreground leading-tight">
                        {currentLocale === 'hi' ? 'पहले से खाता है?' : 'Already have an account?'}
                      </div>
                    </div>
                  </Link>

                  <div className="border-t-2 border-dashed border-ink/20 my-1" />

                  {/* Sign Up Link */}
                  <Link
                    href="/signup"
                    onClick={() => setIsAuthDropdownOpen(false)}
                    className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${
                      pathname === '/signup'
                        ? 'border-ink bg-surface-yellow text-ink font-bold shadow-xs'
                        : 'border-transparent hover:border-ink hover:bg-surface-yellow/40 text-ink dark:text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-ink bg-primary-orange flex items-center justify-center text-white shrink-0 shadow-xs">
                      <UserPlus className="w-4 h-4 text-white" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-bold text-xs leading-snug">{tNav('signup')}</div>
                      <div className="text-[10px] text-text-secondary dark:text-muted-foreground leading-tight">
                        {currentLocale === 'hi'
                          ? 'नया छात्र या शिक्षक खाता'
                          : 'New student or teacher'}
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}
