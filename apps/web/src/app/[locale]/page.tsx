import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
  };
}

export default async function HomePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'home' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  const grades = [
    { grade: 6, label: locale === 'hi' ? 'कक्षा 6' : 'Class 6' },
    { grade: 7, label: locale === 'hi' ? 'कक्षा 7' : 'Class 7' },
    { grade: 8, label: locale === 'hi' ? 'कक्षा 8' : 'Class 8' },
    { grade: 9, label: locale === 'hi' ? 'कक्षा 9' : 'Class 9' },
    { grade: 10, label: locale === 'hi' ? 'कक्षा 10' : 'Class 10' },
  ];

  return (
    <div className="flex flex-col gap-16 py-8 sm:py-16">
      {/* Hero Section */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6 text-center flex flex-col items-center">
        <Badge variant="default" size="md" className="mb-6 font-semibold py-1.5 px-3.5">
          {t('heroBadge')}
        </Badge>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl leading-tight">
          {t('heroTitle')}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* Grade Selection Row */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label="Class Selection"
        >
          {grades.map((item) => (
            <Link key={item.grade} href={`/for-students`}>
              <Button variant="outline" size="sm" className="font-medium hover:border-primary">
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/diagnostic">
            <Button variant="primary" size="lg" className="font-semibold shadow-elevated">
              {t('heroCtaPrimary')}
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">
              {t('heroCtaSecondary')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Cited National Data & The Problem */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-card/60 p-8 sm:p-12 shadow-card backdrop-blur-xs">
          <div className="max-w-3xl text-left mb-10">
            <Badge variant="warning" size="sm" className="mb-3 font-semibold">
              {tCommon('sourceLabel')}
            </Badge>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('problemHeading')}
            </h2>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              {t('problemText')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat 1: UDISE+ */}
            <Card className="border-border/80 bg-background/80 flex flex-col justify-between">
              <CardHeader>
                <div className="text-3xl sm:text-4xl font-extrabold text-primary font-serif">
                  {t('stat1Value')}
                </div>
                <CardTitle className="text-base font-semibold mt-2">{t('stat1Label')}</CardTitle>
                <CardDescription className="text-xs mt-3 border-t border-border/60 pt-3 text-muted-foreground/90 font-mono">
                  {t('stat1Source')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Stat 2: ASER */}
            <Card className="border-border/80 bg-background/80 flex flex-col justify-between">
              <CardHeader>
                <div className="text-3xl sm:text-4xl font-extrabold text-accent font-serif">
                  {t('stat2Value')}
                </div>
                <CardTitle className="text-base font-semibold mt-2">{t('stat2Label')}</CardTitle>
                <CardDescription className="text-xs mt-3 border-t border-border/60 pt-3 text-muted-foreground/90 font-mono">
                  {t('stat2Source')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Stat 3: 5 Step Loop */}
            <Card className="border-border/80 bg-background/80 flex flex-col justify-between">
              <CardHeader>
                <div className="text-3xl sm:text-4xl font-extrabold text-success font-serif">
                  {t('stat3Value')}
                </div>
                <CardTitle className="text-base font-semibold mt-2">{t('stat3Label')}</CardTitle>
                <CardDescription className="text-xs mt-3 border-t border-border/60 pt-3 text-muted-foreground/90 font-mono">
                  {t('stat3Source')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Curriculum Coverage */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t('frameworkHeading')}
          </h2>
          <p className="mt-2 text-muted-foreground">{t('frameworkDesc')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { subject: locale === 'hi' ? 'गणित' : 'Mathematics', code: 'MATH' },
            { subject: locale === 'hi' ? 'विज्ञान' : 'Science', code: 'SCI' },
            { subject: locale === 'hi' ? 'अंग्रेजी' : 'English', code: 'ENG' },
            { subject: locale === 'hi' ? 'सामाजिक विज्ञान' : 'Social Science', code: 'SST' },
          ].map((item) => (
            <Card
              key={item.code}
              className="text-center p-6 hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-0">
                <span className="text-xs font-mono font-bold text-primary tracking-widest block mb-1">
                  {item.code}
                </span>
                <span className="text-base font-semibold text-foreground">{item.subject}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
