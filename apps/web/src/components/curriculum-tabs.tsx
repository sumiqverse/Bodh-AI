'use client';

import * as React from 'react';
import { usePathname, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { BookOpen, Network, CheckSquare, UploadCloud } from 'lucide-react';

export function CurriculumTabs(): React.JSX.Element {
  const pathname = usePathname();
  const t = useTranslations('curriculum');

  const tabs = [
    {
      label: t('contentBrowser'),
      href: '/curriculum',
      icon: BookOpen,
      isActive: pathname === '/curriculum',
    },
    {
      label: t('skillGraph'),
      href: '/curriculum/graph',
      icon: Network,
      isActive: pathname === '/curriculum/graph',
    },
    {
      label: t('questionReview'),
      href: '/curriculum/questions',
      icon: CheckSquare,
      isActive: pathname?.startsWith('/curriculum/questions') ?? false,
    },
    {
      label: t('bulkImport'),
      href: '/curriculum/import',
      icon: UploadCloud,
      isActive: pathname === '/curriculum/import',
    },
  ];

  return (
    <div className="flex border-b border-border bg-card/60 backdrop-blur-xs px-4 pt-3 pb-0 overflow-x-auto gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              active
                ? 'border-primary text-primary font-semibold bg-primary/5 rounded-t-md'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
