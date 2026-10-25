import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardHeader, CardTitle, CardDescription, Button, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'teachers' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ForTeachersPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'teachers' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="default" size="sm" className="mb-3 font-semibold">
          Educators & Mentors
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold mb-3">
              01
            </div>
            <CardTitle>{t('card1Title')}</CardTitle>
            <CardDescription className="mt-2">{t('card1Desc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold mb-3">
              02
            </div>
            <CardTitle>{t('card2Title')}</CardTitle>
            <CardDescription className="mt-2">{t('card2Desc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center font-bold mb-3">
              03
            </div>
            <CardTitle>{t('card3Title')}</CardTitle>
            <CardDescription className="mt-2">{t('card3Desc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-14 text-center">
        <Link href="/contact">
          <Button variant="primary" size="lg" className="shadow-md">
            {tCommon('contactUs')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
