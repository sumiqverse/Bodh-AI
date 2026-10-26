import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@bodhai/ui';
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
  const typedLocale = locale === 'hi' ? 'hi' : 'en';

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
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

      <ChapterDownloadManager chapters={OFFLINE_SAMPLE_CHAPTERS} locale={typedLocale} />
    </div>
  );
}
