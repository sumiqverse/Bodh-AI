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
      className="inline-flex items-center rounded-full border-2 border-ink p-1 bg-surface-cream/50 shadow-xs"
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => handleLocaleChange('en')}
        aria-pressed={currentLocale === 'en'}
        aria-label="EN - Switch to English"
        className={`min-h-[44px] min-w-[44px] px-3.5 text-xs font-black rounded-full inline-flex items-center justify-center transition-all cursor-pointer select-none ${
          currentLocale === 'en'
            ? 'bg-primary-orange text-ink border-2 border-ink shadow-xs'
            : 'text-ink/80 hover:text-ink font-bold'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleLocaleChange('hi')}
        aria-pressed={currentLocale === 'hi'}
        aria-label="हिन्दी - Switch to Hindi"
        className={`min-h-[44px] min-w-[44px] px-3.5 text-xs font-black rounded-full inline-flex items-center justify-center transition-all cursor-pointer select-none ${
          currentLocale === 'hi'
            ? 'bg-primary-orange text-ink border-2 border-ink shadow-xs'
            : 'text-ink/80 hover:text-ink font-bold'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
