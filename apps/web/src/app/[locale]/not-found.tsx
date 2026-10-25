'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@bodhai/ui';

export default function NotFoundPage(): React.JSX.Element {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');

  return (
    <div className="container mx-auto max-w-xl px-4 py-24 sm:py-32 flex items-center justify-center">
      <Card className="text-center p-6 sm:p-8 shadow-elevated border-border bg-card w-full">
        <CardHeader>
          <div className="font-mono text-5xl font-black text-primary mb-2">404</div>
          <CardTitle className="font-serif text-2xl font-bold">{t('notFoundTitle')}</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            {t('notFoundDesc')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-4">
          <Link href="/">
            <Button variant="primary" size="md">
              {tCommon('backToHome')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
