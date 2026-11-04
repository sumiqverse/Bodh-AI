'use client';

import * as React from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
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
      className="h-10 inline-flex items-center rounded-full border-2 border-ink p-0.5 bg-surface-cream/50 shadow-xs shrink-0 box-border"
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => handleLocaleChange('en')}
        aria-pressed={currentLocale === 'en'}
        aria-label="EN - Switch to English"
        className={`h-full px-3 text-xs font-black rounded-full inline-flex items-center justify-center transition-all cursor-pointer select-none border-2 ${
          currentLocale === 'en'
            ? 'bg-primary-orange text-ink border-ink shadow-xs'
            : 'border-transparent text-ink/80 hover:text-ink font-bold'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleLocaleChange('hi')}
        aria-pressed={currentLocale === 'hi'}
        aria-label="हिन्दी - Switch to Hindi"
        className={`h-full px-3 text-xs font-black rounded-full inline-flex items-center justify-center transition-all cursor-pointer select-none border-2 ${
          currentLocale === 'hi'
            ? 'bg-primary-orange text-ink border-ink shadow-xs'
            : 'border-transparent text-ink/80 hover:text-ink font-bold'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
