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
    { label: tNav('about'), href: '/about', isActive: pathname === '/about' },
    { label: tNav('contact'), href: '/contact', isActive: pathname === '/contact' },
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
        <Link href="/contact">
          <Button variant="primary" size="sm" className="font-semibold shadow-xs">
            {tCommon('tryDiagnostic')}
          </Button>
        </Link>
      }
    />
  );
}
