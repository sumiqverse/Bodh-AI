'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@bodhai/ui';
import { useLanguageChoice } from '@/hooks/useLanguageChoice';

export default function LanguageChoicePage(): React.JSX.Element {
  const t = useTranslations('languageChoice');
  const { currentLocale, languages, selectLanguage } = useLanguageChoice();

  const [selectedLang, setSelectedLang] = React.useState<'en' | 'hi'>(currentLocale);

  const handleConfirm = (): void => {
    selectLanguage(selectedLang, '/student');
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col items-center justify-center px-4 py-8">
      <Card className="w-full shadow-floating border-border/80">
        <CardHeader className="text-center pb-4">
          <Badge variant="default" size="sm" className="mx-auto mb-2 font-semibold">
            {t('currentSelection', { lang: selectedLang === 'hi' ? 'हिन्दी' : 'English' })}
          </Badge>
          <CardTitle className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label={t('title')}>
            {languages.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base sm:text-lg">
                        {lang.nativeName}
                      </span>
                      <Badge
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                      >
                        {lang.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {lang.code === 'hi' ? t('hindiCardDesc') : t('englishCardDesc')}
                    </p>
                  </div>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <div className="h-2.5 w-2.5 rounded-full bg-white dark:bg-black" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            className="w-full min-h-[48px] cursor-pointer py-3 text-base font-semibold shadow-elevated mt-4"
          >
            {t('continueButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
