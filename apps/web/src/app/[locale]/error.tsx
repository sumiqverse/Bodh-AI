'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@bodhai/ui';

export default function ErrorBoundaryPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');

  React.useEffect(() => {
    // Error logged for monitoring
    console.error('ErrorBoundary caught:', error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-xl px-4 py-24 sm:py-32 flex items-center justify-center">
      <Card className="text-center p-6 sm:p-8 shadow-elevated border-destructive/30 bg-card w-full">
        <CardHeader>
          <div className="text-4xl mb-2" aria-hidden="true">
            ⚠️
          </div>
          <CardTitle className="font-serif text-2xl font-bold text-destructive">
            {t('errorTitle')}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            {t('errorDesc')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center gap-3 pt-4">
          <Button variant="outline" size="md" onClick={() => reset()}>
            {t('tryAgain')}
          </Button>
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
