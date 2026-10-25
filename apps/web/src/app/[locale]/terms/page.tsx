import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge, Card, CardHeader, CardTitle, CardContent } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('termsTitle'),
    description: t('termsSubtitle'),
  };
}

export default async function TermsPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'legal' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 text-left">
      {/* Prominent Legal Review Alert Banner */}
      <div
        role="alert"
        className="mb-8 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-foreground flex items-start gap-3"
      >
        <span className="text-xl shrink-0" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex flex-col gap-1">
          <strong className="text-warning font-bold uppercase tracking-wide">
            {tCommon('draftNotice')}
          </strong>
          <p className="text-muted-foreground leading-relaxed">{t('draftNoticeBanner')}</p>
        </div>
      </div>

      <div className="mb-10">
        <Badge variant="warning" size="sm" className="mb-2 font-mono">
          DRAFT — LEGAL REVIEW IN PROGRESS
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {t('termsTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('termsSubtitle')}</p>
      </div>

      <Card className="p-2 sm:p-4 shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Terms & Conditions of Service</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm text-muted-foreground leading-relaxed">
          <p>{t('termsP1')}</p>
          <p>{t('termsP2')}</p>
          <p>{t('termsP3')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
