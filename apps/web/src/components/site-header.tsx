'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { Navbar, Button, buttonVariants } from '@bodhai/ui';
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
import { Settings } from 'lucide-react';

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
        label: tNav('safety'),
        href: '/privacy-safety',
        isActive: pathname === '/privacy-safety' || pathname === '/privacy-policy',
      },
      {
        label: tNav('contact'),
        href: '/contact',
        isActive: pathname === '/contact',
      },
    ];
  }, [currentUser, currentLocale, mounted, pathname, tNav]);

  const brandHref = currentUser ? getUserDashboardPath(currentUser) : '/';

  return (
    <Navbar
      brandName={tCommon('brand')}
      brandHref={brandHref}
      items={navItems}
      linkComponent={Link}
      languageSwitcher={<LanguageSwitcher />}
      themeToggle={<ThemeToggle label={tCommon('theme')} />}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {mounted && currentUser ? (
            <>
              {/* Student Classrooms Dashboard shortcut */}
              {currentUser.role === 'student' && (
                <Link
                  href="/student"
                  className={buttonVariants({
                    variant: pathname.startsWith('/student') ? 'primary' : 'outline',
                    size: 'sm',
                    className: `font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                      pathname.startsWith('/student')
                        ? 'shadow-xs'
                        : 'border-primary/40 text-primary hover:bg-primary/10'
                    }`,
                  })}
                >
                  {currentLocale === 'hi' ? 'मेरी कक्षाएं' : 'My Classrooms'}
                </Link>
              )}
              {/* Teacher Classroom Dashboard shortcut */}
              {currentUser.role === 'teacher' && (
                <Link
                  href="/classes"
                  className={buttonVariants({
                    variant: pathname.startsWith('/classes') ? 'primary' : 'outline',
                    size: 'sm',
                    className: `font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                      pathname.startsWith('/classes')
                        ? 'shadow-xs'
                        : 'border-primary/40 text-primary hover:bg-primary/10'
                    }`,
                  })}
                >
                  {tNav.has('classes')
                    ? tNav('classes')
                    : currentLocale === 'hi'
                      ? 'मेरी कक्षाएँ'
                      : 'My Classes'}
                </Link>
              )}
              {/* Admin Dashboard shortcut */}
              {currentUser.role === 'admin' && (
                <Link
                  href="/admin/stats"
                  className={buttonVariants({
                    variant: pathname.startsWith('/admin') ? 'primary' : 'outline',
                    size: 'sm',
                    className: `font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                      pathname.startsWith('/admin')
                        ? 'shadow-xs'
                        : 'border-primary/40 text-primary hover:bg-primary/10'
                    }`,
                  })}
                >
                  {currentLocale === 'hi' ? 'एडमिन' : 'Admin'}
                </Link>
              )}
              {/* Profile button */}
              <Link
                href="/profile"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: `font-semibold text-xs sm:text-sm border-primary/40 hover:border-primary text-primary transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    pathname === '/profile' ? 'bg-primary/15 border-primary shadow-xs' : ''
                  }`,
                })}
              >
                {userAvatar && (
                  <img
                    src={userAvatar}
                    alt="Avatar"
                    className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-primary/40"
                  />
                )}
                {tNav.has('myProfile')
                  ? tNav('myProfile')
                  : currentLocale === 'hi'
                    ? 'मेरी प्रोफ़ाइल'
                    : 'My Profile'}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="font-medium text-xs sm:text-sm text-destructive hover:bg-destructive/10 whitespace-nowrap shrink-0"
              >
                {tNav('signOut')}
              </Button>
            </>
          ) : (
            <>
              {/* Logged out state: Sign In, Sign Up, Settings */}
              <Link
                href="/login"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: `font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                    pathname === '/login' ? 'bg-muted text-foreground' : ''
                  }`,
                })}
              >
                {tNav('login')}
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({
                  variant: 'primary',
                  size: 'sm',
                  className: `font-semibold text-xs sm:text-sm shadow-xs whitespace-nowrap shrink-0 ${
                    pathname === '/signup' ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`,
                })}
              >
                {tNav('signup')}
              </Link>
            </>
          )}
          <Link
            href="/settings"
            title={tNav('settings')}
            className={`p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
              pathname === '/settings' ? 'bg-muted text-foreground' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="sr-only">{tNav('settings')}</span>
          </Link>
        </div>
      }
    />
  );
}
