'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

export interface LanguageOption {
  code: 'en' | 'hi';
  name: string;
  nativeName: string;
  badge: string;
  description: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    badge: 'Standard Medium',
    description: 'Learn concepts, explanations, and solve math problems in English.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    badge: 'मातृभाषा माध्यम',
    description: 'गणित की सभी अवधारणाएं, प्रश्न और व्याख्याएं सरल हिन्दी में सीखें।',
  },
];

export interface UseLanguageChoiceReturn {
  currentLocale: 'en' | 'hi';
  languages: LanguageOption[];
  selectLanguage: (newLocale: 'en' | 'hi', destination?: string) => void;
}

export function useLanguageChoice(): UseLanguageChoiceReturn {
  const currentLocale = useLocale() as 'en' | 'hi';
  const router = useRouter();
  const pathname = usePathname();

  const selectLanguage = React.useCallback(
    (newLocale: 'en' | 'hi', destination?: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bodhai_preferred_language', newLocale);
      }
      const targetPath = destination ?? pathname ?? '/student';
      router.replace(targetPath, { locale: newLocale });
    },
    [pathname, router],
  );

  return {
    currentLocale,
    languages: SUPPORTED_LANGUAGES,
    selectLanguage,
  };
}
