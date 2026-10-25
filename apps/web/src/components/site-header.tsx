'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/routing';
import { Navbar, Button } from '@bodhai/ui';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader(): React.JSX.Element {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();

  const navItems = [
    { label: tNav('howItWorks'), href: '/how-it-works', isActive: pathname === '/how-it-works' },
    { label: tNav('students'), href: '/for-students', isActive: pathname === '/for-students' },
    { label: tNav('teachers'), href: '/for-teachers', isActive: pathname === '/for-teachers' },
    { label: tNav('schools'), href: '/for-schools', isActive: pathname === '/for-schools' },
    {
      label: tNav('languages'),
      href: '/languages-offline',
      isActive: pathname === '/languages-offline',
    },
    { label: tNav('safety'), href: '/privacy-safety', isActive: pathname === '/privacy-safety' },
    { label: tNav('contact'), href: '/contact', isActive: pathname === '/contact' },
    {
      label: tNav.has('curriculum') ? tNav('curriculum') : 'Curriculum',
      href: '/curriculum',
      isActive: pathname?.startsWith('/curriculum') ?? false,
    },
  ];

  return (
    <Navbar
      brandName={tCommon('brand')}
      brandHref="/"
      items={navItems}
      linkComponent={Link}
      languageSwitcher={<LanguageSwitcher />}
      themeToggle={<ThemeToggle label={tCommon('theme')} />}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-medium text-xs sm:text-sm">
              {tNav('login')}
            </Button>
          </Link>
          <Link href="/classes">
            <Button variant="outline" size="sm" className="font-medium text-xs sm:text-sm">
              {tNav('classes')}
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="font-medium text-xs sm:text-sm">
              {tNav('settings')}
            </Button>
          </Link>
          <Link href="/contact" className="hidden sm:inline-flex">
            <Button variant="primary" size="sm" className="font-semibold shadow-xs">
              {tCommon('tryDiagnostic')}
            </Button>
          </Link>
        </div>
      }
    />
  );
}
