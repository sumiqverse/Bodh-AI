import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'languagesOffline' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function LanguagesOfflinePage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'languagesOffline' });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="default" size="sm" className="mb-3 font-semibold">
          Vernacular & Resilient
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-2 border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="text-2xl mb-2" aria-hidden="true">
              🌐
            </div>
            <CardTitle className="text-xl font-bold font-serif text-foreground">
              {t('langTitle')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t('langDesc')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-2 border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="text-2xl mb-2" aria-hidden="true">
              ⚡
            </div>
            <CardTitle className="text-xl font-bold font-serif text-foreground">
              {t('offlineTitle')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t('offlineDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
