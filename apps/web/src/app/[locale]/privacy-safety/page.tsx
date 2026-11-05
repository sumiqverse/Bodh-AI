import type { Metadata } from 'next';
import { MarketingAnswer } from '@/components/marketing-answer';
import { PublicPageFaq } from '@/components/public-page-faq';
import { publicPageMetadata } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck, Ban, FileCheck2, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacySafety' });

  return publicPageMetadata({
    locale,
    path: 'privacy-safety',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function PrivacySafetyPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'privacySafety' });

  return (
    <div className="min-h-screen bg-canvas-gradient py-8 sm:py-16 px-4 sm:px-6 flex justify-center">
      {/* App Shell Container */}
      <div className="w-full max-w-5xl rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-12 shadow-shell relative overflow-hidden flex flex-col justify-between">
        {/* Decorative Corner Arc Accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-surface-peach-light/80 border-2 border-ink/10 pointer-events-none" />

        <div>
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream hover:bg-surface-yellow text-ink px-4 py-1.5 text-xs font-bold shadow-xs hover:-translate-y-0.5 transition-all mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === 'hi' ? 'मुख्य पृष्ठ पर वापस' : 'Back to Home'}</span>
          </Link>

          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-xs font-bold text-ink shadow-xs mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 border border-ink" />
              {locale === 'hi' ? 'बाल संरक्षण एवं गोपनीयता' : 'Child Protection & Safety'}
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-ink dark:text-white leading-tight">
              {t('title')}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
              {t('subtitle')}
            </p>
          </div>

          <div className="mb-8">
            <MarketingAnswer question={t('answerQuestion')} answer={t('answerText')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Principle 1 */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 dark:bg-muted/20 p-6 space-y-4 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-surface-cream border-2 border-ink text-ink flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-6 h-6 text-ink" />
              </div>
              <h2 className="font-black text-lg text-ink dark:text-white">
                {t('principle1Title')}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
                {t('principle1Desc')}
              </p>
            </div>

            {/* Principle 2 */}
            <div className="rounded-2xl border-2 border-ink bg-surface-peach/40 dark:bg-muted/20 p-6 space-y-4 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-surface-peach border-2 border-ink text-ink flex items-center justify-center font-bold shadow-xs">
                <Ban className="w-6 h-6 text-ink" />
              </div>
              <h2 className="font-black text-lg text-ink dark:text-white">
                {t('principle2Title')}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
                {t('principle2Desc')}
              </p>
            </div>

            {/* Principle 3 */}
            <div className="rounded-2xl border-2 border-ink bg-surface-blue/40 dark:bg-muted/20 p-6 space-y-4 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-surface-blue border-2 border-ink text-ink flex items-center justify-center font-bold shadow-xs">
                <FileCheck2 className="w-6 h-6 text-ink" />
              </div>
              <h2 className="font-black text-lg text-ink dark:text-white">
                {t('principle3Title')}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
                {t('principle3Desc')}
              </p>
            </div>
          </div>

          <PublicPageFaq
            locale={locale}
            path="privacy-safety"
            pageName={t('title')}
            pageDescription={t('subtitle')}
          />
        </div>

        {/* Footer compliance note */}
        <div className="mt-12 pt-6 border-t-2 border-dashed border-ink/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary dark:text-muted-foreground">
          <span>
            {locale === 'hi'
              ? 'विद्यार्थी गोपनीयता और डेटा संरक्षण के हमारे सिद्धांत'
              : 'Our principles for student privacy and data protection'}
          </span>
          <Link
            href="/contact"
            className="font-bold text-ink dark:text-white hover:underline flex items-center gap-1"
          >
            {locale === 'hi' ? 'हमारी टीम से संपर्क करें →' : 'Contact our team →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
