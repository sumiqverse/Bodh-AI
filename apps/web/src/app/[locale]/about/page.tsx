import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function AboutPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'about' });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="default" size="sm" className="mb-3 font-semibold">
          Organization & Purpose
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-4 hover:border-primary/40 transition-colors">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-primary">{t('missionTitle')}</CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed mt-3">
              {t('missionDesc')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-4 hover:border-primary/40 transition-colors">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-primary">{t('teamTitle')}</CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed mt-3">
              {t('teamDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
