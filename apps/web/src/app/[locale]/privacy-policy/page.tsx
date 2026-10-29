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
    title: t('privacyTitle'),
    description: t('privacySubtitle'),
  };
}

export default async function PrivacyPolicyPage({ params }: PageProps): Promise<React.JSX.Element> {
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
          {t('privacyTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('privacySubtitle')}</p>
      </div>

      <Card className="p-2 sm:p-4 shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-serif">
            Digital Personal Data Protection (DPDP) Act 2023 Statutory Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm text-muted-foreground leading-relaxed">
          <p>{t('privacyP1')}</p>
          <p>{t('privacyP2')}</p>
          <p>{t('privacyP3')}</p>
          <p>{t('privacyP4')}</p>
          <p>{t('privacyP5')}</p>

          <div className="mt-4 pt-4 border-t border-border">
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
              {t('legalReviewDisclaimer')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
