import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { HomeAuthRedirect } from '@/components/home-auth-redirect';
import { Badge } from '@bodhai/ui';
import {
  Target,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  GraduationCap,
  Users,
  School,
  Globe,
  WifiOff,
  Lock,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Atom,
  BookOpenText,
  Compass,
  Languages,
} from 'lucide-react';

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
  const tHowItWorks = await getTranslations({ locale, namespace: 'howItWorks' });
  const tStudents = await getTranslations({ locale, namespace: 'students' });
  const tTeachers = await getTranslations({ locale, namespace: 'teachers' });
  const tSchools = await getTranslations({ locale, namespace: 'schools' });
  const tLanguages = await getTranslations({ locale, namespace: 'languagesOffline' });
  const tPrivacy = await getTranslations({ locale, namespace: 'privacySafety' });

  const grades = [
    { grade: 6, label: locale === 'hi' ? 'कक्षा 6' : 'Class 6' },
    { grade: 7, label: locale === 'hi' ? 'कक्षा 7' : 'Class 7' },
    { grade: 8, label: locale === 'hi' ? 'कक्षा 8' : 'Class 8' },
    { grade: 9, label: locale === 'hi' ? 'कक्षा 9' : 'Class 9' },
    { grade: 10, label: locale === 'hi' ? 'कक्षा 10' : 'Class 10' },
  ];

  const steps = [
    {
      num: '1',
      title: tHowItWorks('step1Title'),
      desc: tHowItWorks('step1Desc'),
      icon: Target,
      cardBg: 'bg-surface-cream',
    },
    {
      num: '2',
      title: tHowItWorks('step2Title'),
      desc: tHowItWorks('step2Desc'),
      icon: BookOpen,
      cardBg: 'bg-surface-blue',
    },
    {
      num: '3',
      title: tHowItWorks('step3Title'),
      desc: tHowItWorks('step3Desc'),
      icon: Lightbulb,
      cardBg: 'bg-surface-yellow',
    },
    {
      num: '4',
      title: tHowItWorks('step4Title'),
      desc: tHowItWorks('step4Desc'),
      icon: ShieldCheck,
      cardBg: 'bg-surface-pink',
    },
    {
      num: '5',
      title: tHowItWorks('step5Title'),
      desc: tHowItWorks('step5Desc'),
      icon: TrendingUp,
      cardBg: 'bg-surface-peach',
    },
  ];

  return (
    <div
      suppressHydrationWarning
      className="flex flex-col gap-16 sm:gap-24 py-8 sm:py-16 bg-canvas-gradient"
    >
      <HomeAuthRedirect />
      {/* 1. Hero Section */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6 text-center flex flex-col items-center">
        {/* NEP 2020 Pedagogical Framework Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-xs font-bold text-ink shadow-xs mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
          {t('heroBadge')}
        </div>

        <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-ink dark:text-white max-w-4xl leading-[1.15]">
          {t('heroTitle')}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-text-secondary dark:text-muted-foreground max-w-2xl leading-relaxed font-medium">
          {t('heroSubtitle')}
        </p>

        {/* Grade Selection Row */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
          role="group"
          aria-label="Class Selection"
        >
          {grades.map((item) => (
            <Link
              key={item.grade}
              href={`/diagnostic?curriculum=NCERT-MATH-C${item.grade}`}
              className="rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream px-5 py-2 text-sm font-bold text-ink shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA Buttons Row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/diagnostic"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink font-black px-8 py-3.5 text-base shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>{t('heroCtaPrimary')}</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink px-6 py-3.5 text-base font-bold shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>{locale === 'hi' ? 'कक्षा कोड से जुड़ें' : 'Join Class with Code'}</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface-butter hover:bg-surface-yellow text-ink px-6 py-3.5 text-base font-bold shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>{locale === 'hi' ? 'यह कैसे काम करता है' : 'How it Works'}</span>
          </a>
        </div>
      </section>

      {/* 2. Cited National Data & The Problem */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-8 sm:p-12 shadow-shell relative overflow-hidden">
          <div className="max-w-3xl text-left mb-10">
            <Badge
              variant="warning"
              size="sm"
              className="mb-3 font-bold border-2 border-ink bg-surface-yellow text-ink shadow-xs"
            >
              {tCommon('sourceLabel')}
            </Badge>
            <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
              {t('problemHeading')}
            </h2>
            <p className="mt-3 text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
              {t('problemText')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat 1: UDISE+ */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream p-6 flex flex-col justify-between shadow-xs hover:-translate-y-0.5 transition-transform">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ink font-sans">
                  {t('stat1Value')}
                </div>
                <div className="text-base font-bold text-ink mt-2">{t('stat1Label')}</div>
              </div>
              <div className="text-xs mt-4 border-t-2 border-ink/20 pt-3 text-ink/80 font-bold font-mono">
                {t('stat1Source')}
              </div>
            </div>

            {/* Stat 2: ASER */}
            <div className="rounded-2xl border-2 border-ink bg-surface-peach p-6 flex flex-col justify-between shadow-xs hover:-translate-y-0.5 transition-transform">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ink font-sans">
                  {t('stat2Value')}
                </div>
                <div className="text-base font-bold text-ink mt-2">{t('stat2Label')}</div>
              </div>
              <div className="text-xs mt-4 border-t-2 border-ink/20 pt-3 text-ink/80 font-bold font-mono">
                {t('stat2Source')}
              </div>
            </div>

            {/* Stat 3: 5 Step Loop */}
            <div className="rounded-2xl border-2 border-ink bg-surface-blue p-6 flex flex-col justify-between shadow-xs hover:-translate-y-0.5 transition-transform">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ink font-sans">
                  {t('stat3Value')}
                </div>
                <div className="text-base font-bold text-ink mt-2">{t('stat3Label')}</div>
              </div>
              <div className="text-xs mt-4 border-t-2 border-ink/20 pt-3 text-ink/80 font-bold font-mono">
                {t('stat3Source')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section: How BodhAI Works (5-Step Adaptive Loop) */}
      <section id="how-it-works" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-8 sm:p-12 shadow-shell relative overflow-hidden">
          {/* Decorative Corner Arc Accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-surface-butter/70 border-2 border-ink/10 pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <Badge
              variant="default"
              className="text-xs font-bold border-2 border-ink bg-surface-yellow text-ink shadow-xs"
            >
              {locale === 'hi' ? '5-चरणीय अनुकूली अधिगम चक्र' : '5-Step Adaptive Pedagogical Loop'}
            </Badge>
            <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
              {tHowItWorks('title')}
            </h2>
            <p className="text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
              {tHowItWorks('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  className={`p-5 rounded-2xl border-2 border-ink ${st.cardBg} shadow-xs hover:shadow-card hover:-translate-y-1 transition-all flex flex-col justify-between gap-4`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-ink bg-surface-white text-ink shadow-xs">
                        0{st.num}
                      </span>
                      <Icon className="w-5 h-5 text-ink" />
                    </div>
                    <h3 className="font-bold text-base text-ink">{st.title}</h3>
                    <p className="text-xs text-ink/80 leading-relaxed font-medium">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Section: Solutions for Students, Teachers & Schools */}
      <section id="stakeholders" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge
            variant="default"
            className="text-xs font-bold border-2 border-ink bg-surface-cream text-ink shadow-xs"
          >
            {locale === 'hi' ? 'समाधान: सभी हितधारकों के लिए' : 'Solutions For Every Stakeholder'}
          </Badge>
          <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
            {locale === 'hi'
              ? 'विद्यार्थी, शिक्षक एवं विद्यालय नेतृत्व के लिए विशेष रूप से निर्मित'
              : 'Engineered for Learners, Educators, and School Administrators'}
          </h2>
          <p className="text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
            {locale === 'hi'
              ? 'भारतीय विद्यालयों की वास्तविकताओं को ध्यान में रखकर बनाया गया एक एकीकृत मंच।'
              : 'A comprehensive adaptive platform built specifically for Indian classroom realities.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Stakeholder 1: Students */}
          <div
            id="students"
            className="scroll-mt-24 rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-shell"
          >
            <div className="space-y-6">
              {/* Header: Icon + Category Badge */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-surface-cream border-2 border-ink flex items-center justify-center shadow-xs shrink-0">
                  <GraduationCap className="w-7 h-7 text-ink" strokeWidth={2.2} />
                </div>
                <span className="rounded-full border-2 border-ink bg-surface-cream px-3.5 py-1 text-xs font-bold text-ink shadow-xs">
                  {locale === 'hi' ? 'छात्र' : 'Students'}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-ink dark:text-white tracking-tight leading-snug">
                  {tStudents('title')}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                  {tStudents('subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-surface-cream/50 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tStudents('card1Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tStudents('card1Desc')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-cream/50 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tStudents('card2Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tStudents('card2Desc')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-cream/50 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tStudents('card3Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tStudents('card3Desc')}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/diagnostic"
              className="w-full rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink font-black py-3 text-center text-sm shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <span>{locale === 'hi' ? 'निदान परीक्षा शुरू करें' : 'Start Diagnostic'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Stakeholder 2: Teachers */}
          <div
            id="teachers"
            className="scroll-mt-24 rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-shell"
          >
            <div className="space-y-6">
              {/* Header: Icon + Category Badge */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-surface-blue border-2 border-ink flex items-center justify-center shadow-xs shrink-0">
                  <Users className="w-7 h-7 text-ink" strokeWidth={2.2} />
                </div>
                <span className="rounded-full border-2 border-ink bg-surface-blue px-3.5 py-1 text-xs font-bold text-ink shadow-xs">
                  {locale === 'hi' ? 'शिक्षक' : 'Teachers'}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-ink dark:text-white tracking-tight leading-snug">
                  {tTeachers('title')}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                  {tTeachers('subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-surface-blue/30 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tTeachers('card1Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tTeachers('card1Desc')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-blue/30 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tTeachers('card2Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tTeachers('card2Desc')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-blue/30 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {tTeachers('card3Title')}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tTeachers('card3Desc')}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/classes"
              className="w-full rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink font-bold py-3 text-center text-sm shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <span>{locale === 'hi' ? 'शिक्षक कक्षाएँ देखें' : 'View Classroom Dashboard'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Stakeholder 3: Schools */}
          <div
            id="schools"
            className="scroll-mt-24 rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-shell"
          >
            <div className="space-y-6">
              {/* Header: Icon + Category Badge */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-surface-pink border-2 border-ink flex items-center justify-center shadow-xs shrink-0">
                  <School className="w-7 h-7 text-ink" strokeWidth={2.2} />
                </div>
                <span className="rounded-full border-2 border-ink bg-surface-pink px-3.5 py-1 text-xs font-bold text-ink shadow-xs">
                  {locale === 'hi' ? 'विद्यालय' : 'Schools'}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-ink dark:text-white tracking-tight leading-snug">
                  {tSchools('title')}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                  {tSchools('subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-surface-peach/35 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {locale === 'hi' ? 'हार्डवेयर संगतता' : 'Hardware Accessibility'}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tSchools('feature1')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-peach/35 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {locale === 'hi' ? 'ऑफ़लाइन कंप्यूटर लैब सिंक' : 'Offline Lab Synchronization'}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tSchools('feature2')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-peach/35 dark:bg-muted/30 border-2 border-ink space-y-1 shadow-xs">
                  <strong className="text-ink dark:text-white block text-xs sm:text-sm font-bold">
                    {locale === 'hi' ? 'डीपीडीपी 2023 अधिनियम सुरक्षा' : 'DPDP Act 2023 Compliance'}
                  </strong>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed font-medium">
                    {tSchools('feature3')}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/contact"
              className="w-full rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink font-bold py-3 text-center text-sm shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <span>{locale === 'hi' ? 'विद्यालय संपर्क' : 'School Pilot Inquiry'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Section: Vernacular First & Offline Resilient */}
      <section
        id="languages-offline"
        className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20"
      >
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-8 sm:p-12 shadow-shell space-y-10 relative overflow-hidden">
          {/* Decorative Corner Arc Accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-surface-peach-light/80 border-2 border-ink/10 pointer-events-none" />

          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge
              variant="default"
              className="text-xs font-bold border-2 border-ink bg-surface-yellow text-ink shadow-xs"
            >
              {locale === 'hi' ? 'मातृभाषा प्रथम एवं ऑफ़लाइन सक्षम' : 'Vernacular & Offline-First'}
            </Badge>
            <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
              {tLanguages('title')}
            </h2>
            <p className="text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
              {tLanguages('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-ink bg-surface-cream p-6 space-y-4 shadow-xs hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-surface-white border-2 border-ink text-ink flex items-center justify-center font-bold shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-ink">{tLanguages('langTitle')}</h3>
              <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-medium">
                {tLanguages('langDesc')}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-ink bg-surface-blue p-6 space-y-4 shadow-xs hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-surface-white border-2 border-ink text-ink flex items-center justify-center font-bold shadow-xs">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-ink">{tLanguages('offlineTitle')}</h3>
              <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-medium">
                {tLanguages('offlineDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: Student Privacy & Child Safety (DPDP Act 2023) */}
      <section id="safety" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <Badge
            variant="default"
            className="text-xs font-bold border-2 border-ink bg-surface-cream text-ink shadow-xs"
          >
            {locale === 'hi' ? 'डीपीडीपी 2023 अनुपालन' : 'DPDP Act 2023 Compliant'}
          </Badge>
          <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
            {tPrivacy('title')}
          </h2>
          <p className="text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
            {tPrivacy('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-6 space-y-3 shadow-card hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-surface-cream border-2 border-ink text-ink flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink dark:text-white">
              {tPrivacy('principle1Title')}
            </h3>
            <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed">
              {tPrivacy('principle1Desc')}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-6 space-y-3 shadow-card hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-surface-blue border-2 border-ink text-ink flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink dark:text-white">
              {tPrivacy('principle2Title')}
            </h3>
            <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed">
              {tPrivacy('principle2Desc')}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-6 space-y-3 shadow-card hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-surface-pink border-2 border-ink text-ink flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink dark:text-white">
              {tPrivacy('principle3Title')}
            </h3>
            <p className="text-xs text-text-secondary dark:text-muted-foreground leading-relaxed">
              {tPrivacy('principle3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* 7. Personalized Learning Telemetry Callout */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-[28px] border-2 border-ink bg-surface-yellow/30 dark:bg-card p-8 sm:p-12 shadow-shell space-y-6 relative overflow-hidden">
          {/* Decorative Corner Arc Accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-surface-butter/70 border-2 border-ink/10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge
                variant="default"
                className="text-xs font-bold border-2 border-ink bg-surface-white text-ink shadow-xs"
              >
                {locale === 'hi'
                  ? 'DPDP 2023 अनुपालित व्यक्तिगत प्रोफ़ाइल'
                  : 'DPDP 2023 Compliant Private Profiles'}
              </Badge>
              <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-ink dark:text-white">
                {locale === 'hi'
                  ? 'प्रत्येक छात्र एवं शिक्षक के लिए अलग, सुरक्षित प्रोफ़ाइल'
                  : 'Dedicated, Private Telemetry for Every Student & Educator'}
              </h2>
              <p className="text-sm text-text-secondary dark:text-muted-foreground leading-relaxed">
                {locale === 'hi'
                  ? 'लॉगिन करने पर प्रत्येक शिक्षार्थी को केवल अपनी दक्षता मैट्रिक्स, त्रुटि विश्लेषण और प्रगति दिखती है। शिक्षकों को उनके आवंटित कक्षाओं का निजी डैशबोर्ड प्राप्त होता है।'
                  : 'Upon logging in, each learner accesses exclusively their own Bayesian competency matrix, error patterns, and hint ladders. Educators see their dedicated classroom telemetry and pedagogical decisions.'}
              </p>
            </div>

            <Link
              href="/profile"
              className="font-black text-sm gap-2 shrink-0 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-ink px-8 py-3.5 shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              {locale === 'hi' ? 'मेरी प्रोफ़ाइल खोलें' : 'Access My Profile'} →
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Curriculum Coverage */}
      <section id="curriculum" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 lg:p-12 shadow-shell space-y-8 sm:space-y-10 relative overflow-hidden">
          {/* Decorative Corner Arc Accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-surface-peach-light/80 border-2 border-ink/10 pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream px-4 py-1 text-xs font-bold text-ink shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>
                {locale === 'hi'
                  ? '319 अध्याय • 639 दक्षताएं • कक्षा 6 से 10'
                  : '319 Chapters • 639 Atomic Skills • Classes 6 to 10'}
              </span>
            </div>
            <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
              {t('frameworkHeading')}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-text-secondary dark:text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto">
              {t('frameworkDesc')}
            </p>
          </div>

          {/* 5-Subject Curriculum Stacked Rows: Math, Science, Social Science, English, Hindi */}
          <div className="flex flex-col gap-4">
            {[
              {
                subject: locale === 'hi' ? 'गणित' : 'Mathematics',
                nativeSub: locale === 'hi' ? 'Mathematics' : 'गणित',
                code: 'MATH',
                curriculumPrefix: 'NCERT-MATH',
                bg: 'bg-surface-cream',
                icon: Calculator,
                totalMetrics:
                  locale === 'hi' ? '64 अध्याय • 128 दक्षताएं' : '64 Chapters • 128 Skills',
                classesLabel: locale === 'hi' ? 'कक्षाएं:' : 'Classes:',
                scope:
                  locale === 'hi'
                    ? 'संख्या पद्धति, रैखिक समीकरण, ज्यामिति, बीजगणित, क्षेत्रमिति एवं सांख्यिकी'
                    : 'Number Systems, Linear Equations, Geometry, Algebra, Mensuration & Statistics',
              },
              {
                subject: locale === 'hi' ? 'विज्ञान' : 'Science',
                nativeSub: locale === 'hi' ? 'Science' : 'विज्ञान',
                code: 'SCI',
                curriculumPrefix: 'NCERT-SCIE',
                bg: 'bg-surface-blue',
                icon: Atom,
                totalMetrics:
                  locale === 'hi' ? '62 अध्याय • 124 दक्षताएं' : '62 Chapters • 124 Skills',
                classesLabel: locale === 'hi' ? 'कक्षाएं:' : 'Classes:',
                scope:
                  locale === 'hi'
                    ? 'बल, गति, प्रकाश, रासायनिक अभिक्रियाएं, धातु और कोशिका विज्ञान'
                    : 'Motion, Force, Light, Chemical Reactions, Metals & Cell Biology',
              },
              {
                subject: locale === 'hi' ? 'सामाजिक विज्ञान' : 'Social Science',
                nativeSub: locale === 'hi' ? 'Social Science' : 'सामाजिक विज्ञान',
                code: 'SST',
                curriculumPrefix: 'NCERT-SOCI',
                bg: 'bg-surface-pink',
                icon: Compass,
                totalMetrics:
                  locale === 'hi' ? '61 अध्याय • 122 दक्षताएं' : '61 Chapters • 122 Skills',
                classesLabel: locale === 'hi' ? 'कक्षाएं:' : 'Classes:',
                scope:
                  locale === 'hi'
                    ? 'इतिहास, भूगोल, लोकतांत्रिक राजनीति एवं भारतीय अर्थव्यवस्था'
                    : 'History, Geography, Democratic Politics & Indian Economics',
              },
              {
                subject: locale === 'hi' ? 'अंग्रेजी' : 'English',
                nativeSub: locale === 'hi' ? 'English' : 'अंग्रेजी',
                code: 'ENG',
                curriculumPrefix: 'NCERT-ENGL',
                bg: 'bg-surface-yellow',
                icon: BookOpenText,
                totalMetrics:
                  locale === 'hi' ? '70 मॉड्यूल • 141 दक्षताएं' : '70 Modules • 141 Skills',
                classesLabel: locale === 'hi' ? 'कक्षाएं:' : 'Classes:',
                scope:
                  locale === 'hi'
                    ? 'व्याकरण नियम, गद्यांश समझ, शब्दावली एवं रचनात्मक लेखन'
                    : 'Grammar Frameworks, Reading Comprehension & Writing Skills',
              },
              {
                subject: locale === 'hi' ? 'हिन्दी' : 'Hindi',
                nativeSub: locale === 'hi' ? 'Hindi' : 'हिन्दी',
                code: 'HIN',
                curriculumPrefix: 'NCERT-HIND',
                bg: 'bg-surface-peach',
                icon: Languages,
                totalMetrics:
                  locale === 'hi' ? '62 मॉड्यूल • 124 दक्षताएं' : '62 Modules • 124 Skills',
                classesLabel: locale === 'hi' ? 'कक्षाएं:' : 'Classes:',
                scope:
                  locale === 'hi'
                    ? 'वर्ण विचार, संधि, समास, वाक्य शुद्धि, गद्य-पद्य एवं निबंध'
                    : 'Varn Vichar, Sandhi, Samas, Vyakaran, Comprehension & Composition',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className={`rounded-[24px] border-2 border-ink ${item.bg} p-5 sm:p-6 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all space-y-4`}
                >
                  {/* Tier 1: Subject Header (Icon + Title + Code + Metric Badge + CTA Button) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-surface-white border-2 border-ink flex items-center justify-center text-ink shadow-xs shrink-0">
                        <Icon className="w-6 h-6 text-ink" strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-black text-ink/70 uppercase">
                            {item.code}
                          </span>
                          <span className="text-xs text-ink/80 font-bold">• {item.nativeSub}</span>
                          <span className="rounded-full border border-ink/40 bg-surface-white/95 px-2 py-0.5 text-[10px] font-mono font-bold text-ink shadow-xs">
                            NCERT C6-10
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5">
                          {item.subject}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                      <span className="font-mono text-xs font-bold text-ink/80 bg-surface-white/80 border border-ink/20 px-3 py-1.5 rounded-full shadow-xs">
                        {item.totalMetrics}
                      </span>
                      <Link
                        href={`/diagnostic?curriculum=${item.curriculumPrefix}-C8`}
                        className="rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink font-bold px-4 py-2 text-xs shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <span>{locale === 'hi' ? 'दक्षताएं देखें' : 'View Skills'}</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Link>
                    </div>
                  </div>

                  {/* Tier 2: Syllabus Scope (Left) & Direct Class Access Pills (Right) */}
                  <div className="border-t-2 border-ink/15 pt-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-ink/90 font-medium leading-relaxed max-w-2xl">
                      <span className="font-mono text-[10px] uppercase font-bold text-ink/80 mr-2 tracking-wide block sm:inline">
                        {locale === 'hi' ? 'पाठ्यक्रम विस्तार:' : 'Curriculum Scope:'}
                      </span>
                      {item.scope}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-ink uppercase tracking-wide mr-1">
                        {item.classesLabel}
                      </span>
                      {[6, 7, 8, 9, 10].map((grade) => (
                        <Link
                          key={grade}
                          href={`/diagnostic?curriculum=${item.curriculumPrefix}-C${grade}`}
                          className="rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-xs font-bold text-ink px-3 py-1 shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0"
                          title={`Class ${grade} ${item.subject}`}
                        >
                          Class {grade}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
