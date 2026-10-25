'use client';

import * as React from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@bodhai/ui';
import { useLocale } from 'next-intl';

export function LanguageSwitcher(): React.JSX.Element {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (nextLocale: 'en' | 'hi'): void => {
    if (nextLocale !== currentLocale) {
      router.replace(pathname, { locale: nextLocale });
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border p-0.5 bg-muted/40"
      role="group"
      aria-label="Language Selector"
    >
      <Button
        variant={currentLocale === 'en' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => handleLocaleChange('en')}
        aria-pressed={currentLocale === 'en'}
        aria-label="Switch to English"
        className="h-7 px-2.5 text-xs font-semibold"
      >
        EN
      </Button>
      <Button
        variant={currentLocale === 'hi' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => handleLocaleChange('hi')}
        aria-pressed={currentLocale === 'hi'}
        aria-label="Switch to Hindi (हिन्दी)"
        className="h-7 px-2.5 text-xs font-semibold"
      >
        हिन्दी
      </Button>
    </div>
  );
}
