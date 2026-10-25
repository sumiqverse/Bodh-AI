import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@bodhai/ui';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorks' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function HowItWorksPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'howItWorks' });

  const steps = [
    {
      id: 'diagnose',
      title: t('step1Title'),
      desc: t('step1Desc'),
      badgeVariant: 'primary' as const,
      color: 'border-l-primary',
    },
    {
      id: 'learn',
      title: t('step2Title'),
      desc: t('step2Desc'),
      badgeVariant: 'secondary' as const,
      color: 'border-l-accent',
    },
    {
      id: 'solve',
      title: t('step3Title'),
      desc: t('step3Desc'),
      badgeVariant: 'default' as const,
      color: 'border-l-success',
    },
    {
      id: 'test',
      title: t('step4Title'),
      desc: t('step4Desc'),
      badgeVariant: 'warning' as const,
      color: 'border-l-warning',
    },
    {
      id: 'adapt',
      title: t('step5Title'),
      desc: t('step5Desc'),
      badgeVariant: 'destructive' as const,
      color: 'border-l-primary',
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="default" size="sm" className="mb-3 font-semibold">
          Pedagogical Framework
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <div className="flex flex-col gap-6 relative">
        <div
          className="hidden md:block absolute left-8 top-8 bottom-8 w-0.5 bg-border -z-10"
          aria-hidden="true"
        />

        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={`border-l-4 ${step.color} shadow-sm hover:shadow-card transition-shadow bg-card`}
          >
            <CardHeader className="flex flex-col sm:flex-row sm:items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-bold text-sm text-foreground">
                {index + 1}
              </div>
              <div className="flex flex-col gap-1 text-left">
                <CardTitle className="text-xl font-bold font-serif text-foreground">
                  {step.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {step.desc}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
