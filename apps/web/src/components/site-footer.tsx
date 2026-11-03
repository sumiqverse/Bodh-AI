'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Footer, type FooterLinkSection } from '@bodhai/ui';
import { LanguageSwitcher } from './language-switcher';

export function SiteFooter(): React.JSX.Element {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tFooter = useTranslations('footer');

  const sections: readonly FooterLinkSection[] = [
    {
      title: tFooter('sections.platform'),
      links: [
        { label: tNav('howItWorks'), href: '/#how-it-works' },
        { label: tNav('languages'), href: '/#languages-offline' },
        { label: tNav('about'), href: '/about' },
        { label: tNav('design'), href: '/design' },
      ],
    },
    {
      title: tFooter('sections.stakeholders'),
      links: [
        { label: tNav('students'), href: '/#students' },
        { label: tNav('teachers'), href: '/#teachers' },
        { label: tNav('schools'), href: '/#schools' },
        { label: tNav('contact'), href: '/contact' },
      ],
    },
    {
      title: tFooter('sections.transparency'),
      links: [
        { label: tNav('safety'), href: '/privacy-safety' },
        { label: 'UDISE+ 2024-25 Portal', href: 'https://udiseplus.gov.in' },
        { label: 'ASER 2024 Report', href: 'https://www.asercentre.org' },
      ],
    },
    {
      title: tFooter('sections.legal'),
      links: [
        { label: 'Privacy Policy (Draft)', href: '/privacy-policy' },
        { label: 'Terms of Service (Draft)', href: '/terms' },
      ],
    },
  ];

  return (
    <Footer
      brandName={tCommon('brand')}
      tagline={tCommon('brandTagline')}
      sections={sections}
      citationNotice={tFooter('citation')}
      legalDraftNotice={tFooter('draftLabel')}
      languageSwitcher={<LanguageSwitcher />}
      linkComponent={Link}
    />
  );
}
