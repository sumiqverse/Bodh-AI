import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacySafety' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function PrivacySafetyPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'privacySafety' });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="success" size="sm" className="mb-3 font-semibold">
          Child Protection
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-success/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center font-bold mb-3">
              🛡️
            </div>
            <CardTitle>{t('principle1Title')}</CardTitle>
            <CardDescription className="mt-2">{t('principle1Desc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-success/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center font-bold mb-3">
              🚫
            </div>
            <CardTitle>{t('principle2Title')}</CardTitle>
            <CardDescription className="mt-2">{t('principle2Desc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-success/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center font-bold mb-3">
              📜
            </div>
            <CardTitle>{t('principle3Title')}</CardTitle>
            <CardDescription className="mt-2">{t('principle3Desc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
