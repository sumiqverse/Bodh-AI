import type { Metadata } from 'next';
import { MarketingAnswer } from '@/components/marketing-answer';
import { PublicPageFaq } from '@/components/public-page-faq';
import { publicPageMetadata } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ChapterDownloadManager } from '@/components/offline';

const OFFLINE_SAMPLE_CHAPTERS = [
  {
    chapterId: 'ch-math-6-01',
    chapterTitle: 'Knowing Our Numbers & Integers',
    subject: 'Mathematics',
    grade: 6,
    estimatedSizeBytes: 1024 * 1024,
  },
  {
    chapterId: 'ch-math-7-02',
    chapterTitle: 'Fractions and Decimals',
    subject: 'Mathematics',
    grade: 7,
    estimatedSizeBytes: 1200 * 1024,
  },
  {
    chapterId: 'ch-math-8-02',
    chapterTitle: 'Linear Equations in One Variable',
    subject: 'Mathematics',
    grade: 8,
    estimatedSizeBytes: 1400 * 1024,
  },
  {
    chapterId: 'ch-math-9-02',
    chapterTitle: 'Polynomials & Real Numbers',
    subject: 'Mathematics',
    grade: 9,
    estimatedSizeBytes: 1500 * 1024,
  },
  {
    chapterId: 'ch-math-10-04',
    chapterTitle: 'Quadratic Equations & Arithmetic Progressions',
    subject: 'Mathematics',
    grade: 10,
    estimatedSizeBytes: 1800 * 1024,
  },
];

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'languagesOffline' });

  return publicPageMetadata({
    locale,
    path: 'languages-offline',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function LanguagesOfflinePage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'languagesOffline' });
  const typedLocale = locale === 'hi' ? 'hi' : 'en';

  return (
    <main className="min-h-screen bg-canvas-gradient px-4 py-8 sm:py-12 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      <div className="w-full max-w-5xl space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-block text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-yellow px-4 py-1 text-ink shadow-xs">
            Vernacular & Resilient
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink dark:text-white tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary dark:text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <MarketingAnswer question={t('answerQuestion')} answer={t('answerText')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-card relative overflow-hidden space-y-4 hover:-translate-y-0.5 transition-transform">
            <div className="w-12 h-12 rounded-full border-2 border-ink bg-surface-blue flex items-center justify-center text-2xl shadow-xs">
              🌐
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-black text-ink dark:text-white">
              {t('langTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
              {t('langDesc')}
            </p>
          </div>

          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-card relative overflow-hidden space-y-4 hover:-translate-y-0.5 transition-transform">
            <div className="w-12 h-12 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center text-2xl shadow-xs">
              ⚡
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-black text-ink dark:text-white">
              {t('offlineTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
              {t('offlineDesc')}
            </p>
          </div>
        </div>

        <ChapterDownloadManager chapters={OFFLINE_SAMPLE_CHAPTERS} locale={typedLocale} />

        <PublicPageFaq
          locale={locale}
          path="languages-offline"
          pageName={t('title')}
          pageDescription={t('subtitle')}
        />
      </div>
    </main>
  );
}
