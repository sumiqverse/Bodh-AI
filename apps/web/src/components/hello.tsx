'use client';

import * as React from 'react';
import { Button } from '@bodhai/ui';
import { t, type Locale, type TranslationKey } from '@/lib/i18n';

const gradeKeys: TranslationKey[] = [
  'grade.class6',
  'grade.class7',
  'grade.class8',
  'grade.class9',
  'grade.class10',
];

export function Hello(): React.JSX.Element {
  const [locale, setLocale] = React.useState<Locale>('en');
  const [selectedGrade, setSelectedGrade] = React.useState<string>('grade.class6');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/image.png"
              alt="BodhAI"
              className="h-10 w-10 rounded-full object-contain shrink-0 select-none drop-shadow-xs"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {t('platform.title', locale)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={locale === 'en' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLocale('en')}
              aria-label="Switch to English"
            >
              English
            </Button>
            <Button
              variant={locale === 'hi' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLocale('hi')}
              aria-label="Switch to Hindi"
            >
              हिन्दी
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{t('platform.status.healthy', locale)}</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          {t('platform.welcome', locale)}
        </h1>

        <p className="mt-3 text-lg font-bold text-[#E8800A]">{t('platform.tagline', locale)}</p>

        <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          {t('platform.description', locale)}
        </p>

        <section aria-labelledby="class-selection-heading" className="mt-8 w-full max-w-md">
          <h2 id="class-selection-heading" className="text-sm font-semibold text-slate-700 mb-3">
            {t('grade.select', locale)}
          </h2>
          <div
            className="grid grid-cols-5 gap-2"
            role="group"
            aria-label={t('grade.select', locale)}
          >
            {gradeKeys.map((key) => {
              const isSelected = selectedGrade === key;
              return (
                <Button
                  key={key}
                  variant={isSelected ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGrade(key)}
                  aria-pressed={isSelected}
                >
                  {t(key, locale)}
                </Button>
              );
            })}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button variant="primary" size="lg">
            {t('platform.cta.start', locale)}
          </Button>
          <Button variant="outline" size="lg">
            {t('platform.cta.explore', locale)}
          </Button>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>{t('platform.classes', locale)}</p>
      </footer>
    </div>
  );
}
