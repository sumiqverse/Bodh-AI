import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardTitle, Button, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'schools' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ForSchoolsPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'schools' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  const features = [t('feature1'), t('feature2'), t('feature3'), t('feature4')];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="default" size="sm" className="mb-3 font-semibold">
          Institutional Infrastructure
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="p-6 flex items-start gap-4 hover:border-primary/40 transition-colors"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm"
              aria-hidden="true"
            >
              ✓
            </span>
            <CardTitle className="text-base font-medium leading-relaxed text-foreground">
              {feature}
            </CardTitle>
          </Card>
        ))}
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
