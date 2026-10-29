import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { HomeAuthRedirect } from '@/components/home-auth-redirect';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@bodhai/ui';
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
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      borderAccent: 'border-emerald-500/30',
    },
    {
      num: '2',
      title: tHowItWorks('step2Title'),
      desc: tHowItWorks('step2Desc'),
      icon: BookOpen,
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      borderAccent: 'border-blue-500/30',
    },
    {
      num: '3',
      title: tHowItWorks('step3Title'),
      desc: tHowItWorks('step3Desc'),
      icon: Lightbulb,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      borderAccent: 'border-amber-500/30',
    },
    {
      num: '4',
      title: tHowItWorks('step4Title'),
      desc: tHowItWorks('step4Desc'),
      icon: ShieldCheck,
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      borderAccent: 'border-purple-500/30',
    },
    {
      num: '5',
      title: tHowItWorks('step5Title'),
      desc: tHowItWorks('step5Desc'),
      icon: TrendingUp,
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      borderAccent: 'border-rose-500/30',
    },
  ];

  return (
    <div className="flex flex-col gap-20 py-8 sm:py-16">
      <HomeAuthRedirect />
      {/* 1. Hero Section */}
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
            <Link key={item.grade} href="/diagnostic">
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
          <Link href="/profile">
            <Button variant="outline" size="lg" className="border-primary/50 text-primary font-bold hover:bg-primary/10 shadow-xs">
              {locale === 'hi' ? '👤 मेरी प्रोफ़ाइल' : '👤 My Profile'}
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg">
              {locale === 'hi' ? 'यह कैसे काम करता है ↓' : 'How it Works ↓'}
            </Button>
          </a>
        </div>
      </section>

      {/* 2. Cited National Data & The Problem */}
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

      {/* 3. Section: How BodhAI Works (5-Step Adaptive Loop) */}
      <section id="how-it-works" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10">
            {locale === 'hi' ? '5-चरणीय अनुकूली अधिगम चक्र' : '5-Step Adaptive Pedagogical Loop'}
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {tHowItWorks('title')}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {tHowItWorks('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className={`p-5 rounded-2xl border bg-card/70 hover:bg-card hover:shadow-md transition-all flex flex-col justify-between gap-4 ${st.borderAccent}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${st.badgeColor}`}>
                      0{st.num}
                    </span>
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">
                    {st.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Section: Solutions for Students, Teachers & Schools */}
      <section id="stakeholders" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10">
            {locale === 'hi' ? 'समाधान: सभी हितधारकों के लिए' : 'Solutions For Every Stakeholder'}
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {locale === 'hi'
              ? 'विद्यार्थी, शिक्षक एवं विद्यालय नेतृत्व के लिए विशेष रूप से निर्मित'
              : 'Engineered for Learners, Educators, and School Administrators'}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {locale === 'hi'
              ? 'भारतीय विद्यालयों की वास्तविकताओं को ध्यान में रखकर बनाया गया एक एकीकृत मंच।'
              : 'A comprehensive adaptive platform built specifically for Indian classroom realities.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stakeholder 1: Students */}
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-card to-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {tStudents('title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tStudents('subtitle')}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-muted-foreground">
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tStudents('card1Title')}
                  </strong>
                  <p className="leading-relaxed">{tStudents('card1Desc')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tStudents('card2Title')}
                  </strong>
                  <p className="leading-relaxed">{tStudents('card2Desc')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tStudents('card3Title')}
                  </strong>
                  <p className="leading-relaxed">{tStudents('card3Desc')}</p>
                </div>
              </div>
            </div>

            <Link href="/diagnostic" className="w-full">
              <Button variant="primary" size="sm" className="w-full font-semibold gap-1.5 shadow-xs">
                {locale === 'hi' ? 'निदान परीक्षा शुरू करें' : 'Start Diagnostic'} →
              </Button>
            </Link>
          </div>

          {/* Stakeholder 2: Teachers */}
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-500/5 via-card to-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {tTeachers('title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tTeachers('subtitle')}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-muted-foreground">
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tTeachers('card1Title')}
                  </strong>
                  <p className="leading-relaxed">{tTeachers('card1Desc')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tTeachers('card2Title')}
                  </strong>
                  <p className="leading-relaxed">{tTeachers('card2Desc')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/80 border border-border/80 space-y-1">
                  <strong className="text-foreground block text-xs">
                    {tTeachers('card3Title')}
                  </strong>
                  <p className="leading-relaxed">{tTeachers('card3Desc')}</p>
                </div>
              </div>
            </div>

            <Link href="/classes" className="w-full">
              <Button variant="outline" size="sm" className="w-full font-semibold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 gap-1.5">
                {locale === 'hi' ? 'शिक्षक कक्षाएँ देखें' : 'View Classroom Dashboard'} →
              </Button>
            </Link>
          </div>

          {/* Stakeholder 3: Schools */}
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-500/5 via-card to-card p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {tSchools('title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tSchools('subtitle')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{tSchools('feature1')}</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{tSchools('feature2')}</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{tSchools('feature3')}</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-border/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{tSchools('feature4')}</p>
                </div>
              </div>
            </div>

            <Link href="/contact" className="w-full">
              <Button variant="outline" size="sm" className="w-full font-semibold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-1.5">
                {locale === 'hi' ? 'विद्यालय संपर्क' : 'School Pilot Inquiry'} →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Section: Vernacular First & Offline Resilient */}
      <section id="languages-offline" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 p-8 sm:p-12 shadow-sm space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10">
              {locale === 'hi' ? 'मातृभाषा प्रथम एवं ऑफ़लाइन सक्षम' : 'Vernacular & Offline-First'}
            </Badge>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {tLanguages('title')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tLanguages('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-background/90 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-foreground">
                {tLanguages('langTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {tLanguages('langDesc')}
              </p>
            </Card>

            <Card className="border-border/80 bg-background/90 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-foreground">
                {tLanguages('offlineTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {tLanguages('offlineDesc')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Section: Student Privacy & Child Safety (DPDP Act 2023) */}
      <section id="safety" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            {locale === 'hi' ? 'डीपीडीपी 2023 अनुपालन' : 'DPDP Act 2023 Compliant'}
          </Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {tPrivacy('title')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tPrivacy('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/80 bg-card/80 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              {tPrivacy('principle1Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tPrivacy('principle1Desc')}
            </p>
          </Card>

          <Card className="p-6 border-border/80 bg-card/80 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              {tPrivacy('principle2Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tPrivacy('principle2Desc')}
            </p>
          </Card>

          <Card className="p-6 border-border/80 bg-card/80 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              {tPrivacy('principle3Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tPrivacy('principle3Desc')}
            </p>
          </Card>
        </div>
      </section>

      {/* 7. Personalized Learning Telemetry Callout */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-8 sm:p-12 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10">
                {locale === 'hi' ? '🔒 DPDP 2023 अनुपालित व्यक्तिगत प्रोफ़ाइल' : '🔒 DPDP 2023 Compliant Private Profiles'}
              </Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {locale === 'hi' ? 'प्रत्येक छात्र एवं शिक्षक के लिए अलग, सुरक्षित प्रोफ़ाइल' : 'Dedicated, Private Telemetry for Every Student & Educator'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === 'hi'
                  ? 'लॉगिन करने पर प्रत्येक शिक्षार्थी को केवल अपनी दक्षता मैट्रिक्स, त्रुटि विश्लेषण और प्रगति दिखती है। शिक्षकों को उनके आवंटित कक्षाओं का निजी डैशबोर्ड प्राप्त होता है।'
                  : 'Upon logging in, each learner accesses exclusively their own Bayesian competency matrix, error patterns, and hint ladders. Educators see their dedicated classroom telemetry and pedagogical decisions.'}
              </p>
            </div>

            <Link href="/profile">
              <Button variant="primary" size="lg" className="font-bold text-sm gap-2 shrink-0 shadow-md">
                {locale === 'hi' ? 'मेरी प्रोफ़ाइल खोलें' : 'Access My Profile'} →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Curriculum Coverage */}
      <section id="curriculum" className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20">
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
