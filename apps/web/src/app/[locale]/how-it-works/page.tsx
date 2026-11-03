import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen, CheckCircle2, PencilRuler, RefreshCw, Search } from 'lucide-react';

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
      Icon: Search,
      surface: 'bg-surface-cream',
      iconSurface: 'bg-surface-yellow',
    },
    {
      id: 'learn',
      title: t('step2Title'),
      desc: t('step2Desc'),
      Icon: BookOpen,
      surface: 'bg-surface-blue',
      iconSurface: 'bg-surface-white',
    },
    {
      id: 'solve',
      title: t('step3Title'),
      desc: t('step3Desc'),
      Icon: PencilRuler,
      surface: 'bg-surface-peach',
      iconSurface: 'bg-surface-butter',
    },
    {
      id: 'test',
      title: t('step4Title'),
      desc: t('step4Desc'),
      Icon: CheckCircle2,
      surface: 'bg-surface-pink',
      iconSurface: 'bg-surface-cream',
    },
    {
      id: 'adapt',
      title: t('step5Title'),
      desc: t('step5Desc'),
      Icon: RefreshCw,
      surface: 'bg-surface-butter',
      iconSurface: 'bg-surface-blue',
    },
  ];

  const headingFont = locale === 'hi' ? 'font-sans' : 'font-serif';

  return (
    <div className="relative overflow-hidden bg-canvas-gradient">
      <div
        className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full border-2 border-ink/10 bg-surface-butter/60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-28 top-[34rem] h-72 w-72 rounded-full border-2 border-ink/10 bg-surface-blue/60"
        aria-hidden="true"
      />

      <div className="container relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary-orange" aria-hidden="true" />
            {t('badge')}
          </span>

          <h1
            className={`mt-5 ${headingFont} text-4xl font-black leading-[1.08] tracking-tight text-ink dark:text-white sm:text-5xl md:text-6xl`}
          >
            {t('title')}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-text-secondary dark:text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>

          <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`h-2.5 w-2.5 rounded-full border border-ink ${step.iconSurface}`}
              />
            ))}
          </div>
        </div>

        <section className="relative mx-auto mt-12 max-w-5xl sm:mt-16" aria-label={t('title')}>
          <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-surface-white p-4 shadow-shell dark:bg-card sm:p-7 md:p-9">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border-2 border-ink/10 bg-surface-peach-light/80"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full border-2 border-ink/10 bg-surface-blue/50"
              aria-hidden="true"
            />

            <div className="relative">
              <div
                className="absolute bottom-6 left-[22px] top-6 border-l-2 border-dashed border-ink/20 dark:border-white/20 sm:left-6"
                aria-hidden="true"
              />

              <ol className="relative flex flex-col gap-4 sm:gap-5">
                {steps.map((step, index) => {
                  const Icon = step.Icon;
                  const displayTitle = step.title.replace(/^\d+\.\s*/, '');

                  return (
                    <li key={step.id} className="relative flex items-start gap-3.5 sm:gap-5">
                      <span
                        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface-white text-sm font-black text-ink shadow-sm sm:h-12 sm:w-12 sm:text-base"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>

                      <article
                        className={`min-w-0 flex-1 rounded-card border-2 border-ink ${step.surface} p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated sm:p-6`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2
                            className={`${headingFont} text-xl font-extrabold leading-tight text-ink sm:text-2xl`}
                            aria-label={`${index + 1}. ${displayTitle}`}
                          >
                            {displayTitle}
                          </h2>
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${step.iconSurface} text-ink shadow-sm`}
                            aria-hidden="true"
                          >
                            <Icon className="h-5 w-5" strokeWidth={2.25} />
                          </span>
                        </div>

                        <p className="mt-2.5 max-w-3xl text-sm font-medium leading-relaxed text-ink/75 sm:text-[15px]">
                          {step.desc}
                        </p>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
