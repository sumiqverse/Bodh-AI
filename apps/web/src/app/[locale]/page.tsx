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
  Check,
  X,
  HelpCircle,
  Sparkles,
  Clock,
  Scale,
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'बोधAI क्या है और यह सीखने की कमियों की पहचान कैसे करता है?'
            : 'What is BodhAI and how does it diagnose student learning gaps?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'बोधAI एक खुला अनुकूली अधिगम मंच है जो कक्षा 6 से 10 के NCERT पाठ्यक्रम के लिए निर्मित है। यह बेयसियन नॉलेज ट्रेसिंग (BKT) के माध्यम से छात्रों के उत्तरों और 3-स्तरीय सोक्रेटिक संकेतों के उपयोग का विश्लेषण करके मूलभूत कमियों को तुरंत पहचानता है।'
              : 'BodhAI is an open-source adaptive mastery platform built for Classes 6 to 10 NCERT curriculum. It uses Bayesian Knowledge Tracing (BKT) to analyze response patterns and hint utilization, diagnosing conceptual misconceptions in real time.',
        },
      },
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'कक्षा 6 से 10 के NCERT अभ्यास के लिए बोधAI का उपयोग कैसे करें?'
            : 'How to use BodhAI for Class 6 to 10 NCERT practice?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'छात्र अपनी कक्षा और विषय चुनकर त्वरित 10-प्रश्नों की आधारभूत निदान परीक्षा शुरू कर सकते हैं। इसके बाद प्रणाली सोक्रेटिक 3-स्तरीय संकेतों के साथ व्यक्तिगत अभ्यास प्रस्तुत करती है जिसे ऑफ़लाइन भी पूरा किया जा सकता है।'
              : 'Students select their class and subject, complete a rapid 10-question baseline diagnostic, and receive personalized adaptive practice with 3-tier Socratic hints that can be practiced online or offline.',
        },
      },
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'क्या विद्यालयों को पारंपरिक परीक्षाओं के स्थान पर बोधAI अपनाना चाहिए?'
            : 'Should schools replace conventional exams with BodhAI adaptive diagnostics?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'बोधAI योगात्मक बोर्ड परीक्षाओं को प्रतिस्थापित करने के लिए नहीं, बल्कि सतत रचनात्मक (Formative) मूल्यांकन को सशक्त बनाने के लिए है। यह शिक्षकों को वास्तविक समय में वर्गवार दक्षता अंतर्दृष्टि प्रदान करता है जिससे परीक्षा से पहले कमियों को सुधारा जा सके।'
              : 'BodhAI complements rather than replaces summative board examinations. It provides continuous formative diagnostic insights, allowing teachers to identify and remediate competency gaps weeks before high-stakes exams.',
        },
      },
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'क्या बोधAI बिना इंटरनेट के ऑफ़लाइन कार्य कर सकता है?'
            : 'How does BodhAI work offline without high-speed internet?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'हाँ, बोधAI एक प्रोग्रेसिव वेब ऐप (PWA) है। छात्र और शिक्षक अध्याय अभ्यास पैक और अवधारणा मार्गदर्शिकाएँ पहले से डाउनलोड कर सकते हैं। ऑफ़लाइन अभ्यास का सारा डेटा स्थानीय स्तर पर सुरक्षित रहता है और इंटरनेट मिलने पर स्वतः सिंक हो जाता है।'
              : 'Yes. BodhAI is built as an offline-first Progressive Web App (PWA). Students and school computer labs can pre-download chapter packs and conceptual notes, practice completely disconnected, and auto-sync progress when connectivity is restored.',
        },
      },
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'क्या बोधAI पाठ्यक्रम NCERT एवं CBSE मानकों के अनुरूप है?'
            : 'Is BodhAI curriculum aligned with NCERT and CBSE standards?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'हाँ, बोधAI में गणित, विज्ञान, सामाजिक विज्ञान, अंग्रेजी और हिन्दी के 319 आधिकारिक NCERT अध्याय और 639 परमाणु दक्षताएं सम्मिलित हैं, जो राष्ट्रीय शिक्षा नीति (NEP 2020) के अनुरूप हैं।'
              : 'Yes. BodhAI covers 319 official NCERT chapters and 639 atomic competencies across Mathematics, Science, Social Science, English, and Hindi for Classes 6 to 10, fully aligned with NEP 2020 pedagogical mandates.',
        },
      },
      {
        '@type': 'Question',
        name:
          locale === 'hi'
            ? 'बोधAI छात्र डेटा की सुरक्षा और DPDP अधिनियम 2023 का पालन कैसे करता है?'
            : 'How does BodhAI protect student privacy and comply with the DPDP Act 2023?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            locale === 'hi'
              ? 'बोधAI शून्य वाणिज्यिक ट्रैकिंग, शून्य विज्ञापन, तथा सख्त न्यूनतम डेटा संग्रह नीति का पालन करता है। प्रत्येक शिक्षार्थी की दक्षता रिपोर्ट निजी होती है और डेटा केवल शिक्षण सुधार के लिए उपयोग किया जाता है।'
              : 'BodhAI implements zero commercial ad tracking, zero biometric harvesting, and strict purpose limitation under the Digital Personal Data Protection (DPDP) Act 2023. Learner competency telemetry is strictly private to the student and authorized teacher.',
        },
      },
    ],
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name:
      locale === 'hi'
        ? 'बोधAI पर अनुकूली महारत अधिगम कैसे शुरू करें'
        : 'How to Master NCERT Competencies on BodhAI',
    description:
      'A 5-step adaptive pedagogical workflow to diagnose learning gaps and achieve verified mastery.',
    totalTime: 'PT15M',
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.title,
      text: s.desc,
      url: `https://bodhai.org.in/${locale}#how-it-works`,
    })),
  };

  return (
    <div
      suppressHydrationWarning
      className="flex flex-col gap-16 sm:gap-24 py-8 sm:py-16 bg-canvas-gradient"
    >
      <HomeAuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
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

        {/* Top Summary Answer & Definition Support (Opening Section) */}
        <div className="mt-8 max-w-3xl w-full rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-5 sm:p-6 text-left shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/15 pb-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/40 bg-surface-yellow px-3 py-0.5 text-xs font-bold text-ink uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-ink" />
              {locale === 'hi' ? 'त्वरित सारांश' : 'Top Summary Answer'}
            </span>
            <span className="text-xs font-bold text-ink/70">
              {locale === 'hi' ? 'मुख्य परिभाषा एवं निष्कर्ष' : 'Definition & Key Takeaway'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink/90 dark:text-muted-foreground leading-relaxed font-medium">
            <strong>
              {locale === 'hi'
                ? 'संक्षिप्त सारांश (Bottom-Line Answer):'
                : 'Bottom-Line Answer & Key Takeaway:'}
            </strong>{' '}
            {locale === 'hi'
              ? 'बोधAI भारत में कक्षा 6 से 10 के विद्यार्थियों के लिए एक खुला, गैर-व्यावसायिक और NCERT-संरेखित अनुकूली शिक्षण मंच है। अनुकूली महारत अधिगम (Adaptive Mastery Learning) वह शैक्षणिक ढांचा है जिसमें छात्र अगली अवधारणा पर आगे बढ़ने से पहले पूर्व-आवश्यक दक्षताओं में प्रमाणित महारत प्रदर्शित करते हैं, जो बेयसियन नॉलेज ट्रेसिंग और 3-स्तरीय सोक्रेटिक संकेतों द्वारा संचालित होती है।'
              : 'BodhAI is an open-source, NCERT-aligned adaptive mastery learning platform for Middle and Secondary school students (Classes 6 through 10) across India. Adaptive mastery learning is defined as an educational framework where students demonstrate verified proficiency in prerequisite competencies before moving forward, powered by real-time Bayesian Knowledge Tracing and 3-tier Socratic hint ladders.'}
          </p>
        </div>

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

      {/* Executive Definition & Direct Answer Signals */}
      <section
        id="overview"
        className="container mx-auto max-w-6xl px-4 sm:px-6"
        aria-labelledby="overview-heading"
      >
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 lg:p-12 shadow-shell space-y-8 relative overflow-hidden">
          {/* Subtle Accent Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/15 pb-5">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-yellow px-4 py-1 text-xs font-bold text-ink shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-ink" />
              <span>
                {locale === 'hi'
                  ? 'मूल अवधारणा एवं त्वरित सारांश'
                  : 'Core Definition & Direct Summary'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink/80 bg-surface-cream px-3 py-1 rounded-full border border-ink/20">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {locale === 'hi'
                  ? 'अद्यतन: नवंबर 2026 • आधिकारिक NCERT 2026-27'
                  : 'Updated: November 2026 • Verified NCERT 2026-27'}
              </span>
            </div>
          </div>

          {/* Direct Answer Wording */}
          <div className="max-w-4xl space-y-4">
            <h2
              id="overview-heading"
              className="font-sans text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-ink dark:text-white leading-tight"
            >
              {locale === 'hi'
                ? 'बोधAI क्या है? (What is BodhAI?)'
                : 'What is BodhAI? (Definition & Purpose)'}
            </h2>
            <p className="text-base sm:text-lg text-ink/90 dark:text-muted-foreground leading-relaxed font-medium">
              <strong>{locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}</strong>{' '}
              {locale === 'hi'
                ? 'बोधAI भारत का एक खुला, गैर-व्यावसायिक और NCERT-संरेखित अनुकूली शिक्षण मंच (Adaptive Mastery Learning Platform) है, जिसे विशेष रूप से कक्षा 6 से 10 के माध्यमिक विद्यार्थियों के लिए तैयार किया गया है। यह बेयसियन नॉलेज ट्रेसिंग (BKT) के जरिए विद्यार्थी के प्रत्येक उत्तर का विश्लेषण कर सीखने की कमियों को उजागर करता है और सोक्रेटिक 3-स्तरीय संकेतों (Hint Ladders) द्वारा सही दिशा में मार्गदर्शन करता है।'
                : 'BodhAI is an open-source, NCERT-aligned adaptive mastery learning platform designed for Middle and Secondary school students (Classes 6 to 10) across India. Built to eradicate rote memorization and diagnose hidden learning deficits, BodhAI models student competency dynamically using Bayesian Knowledge Tracing (BKT), providing structured 3-tier Socratic hint ladders and offline-resilient practice without punitive scoring.'}
            </p>
          </div>

          {/* Key Takeaways Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-ink/80">
              {locale === 'hi' ? 'मुख्य निष्कर्ष एवं विशेषताएँ' : 'Key Takeaways & Core Pillars'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border-2 border-ink bg-surface-cream p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>{locale === 'hi' ? '319 NCERT अध्याय' : '319 NCERT Chapters'}</span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? 'गणित, विज्ञान, सा.विज्ञान, अंग्रेजी व हिन्दी की 639 परमाणु दक्षताएं।'
                    : '639 atomic competencies spanning Math, Science, Social Science, English & Hindi.'}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-ink bg-surface-yellow p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>
                    {locale === 'hi' ? 'सोक्रेटिक 3-स्तरीय संकेत' : '3-Tier Socratic Hints'}
                  </span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? 'उत्तर देने के बजाय विचारोत्तेजक संकेत, अवधारणा सूत्र एवं चरणबद्ध सहायता।'
                    : 'Nudges, conceptual clues, and step breakdown instead of spoon-feeding answers.'}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-ink bg-surface-blue p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>{locale === 'hi' ? '100% ऑफ़लाइन सक्षम' : '100% Offline-Resilient'}</span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? 'अध्याय पैक डाउनलोड कर विद्यालय कंप्यूटर लैब या 2G पर बिना इंटरनेट अभ्यास।'
                    : 'Download chapter packs and practice in school computer labs without active internet.'}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-ink bg-surface-peach p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>{locale === 'hi' ? 'DPDP 2023 बाल सुरक्षा' : 'DPDP Act 2023 Safety'}</span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? 'शून्य विज्ञापन, शून्य बायोमेट्रिक ट्रैकिंग, सख्त न्यूनतम डेटा संग्रह नीति।'
                    : 'Zero commercial ads, zero biometric tracking, and strictly isolated student telemetry.'}
                </p>
              </div>
            </div>
          </div>
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

      {/* Comparison & Decision Support Section: BodhAI vs Conventional EdTech */}
      <section
        id="comparison"
        className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20"
        aria-labelledby="comparison-heading"
      >
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 lg:p-12 shadow-shell space-y-10 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="default"
              className="text-xs font-bold border-2 border-ink bg-surface-yellow text-ink shadow-xs"
            >
              {locale === 'hi'
                ? 'तुलनात्मक मूल्यांकन • X vs Y'
                : 'Comparative Analysis • BodhAI vs Alternatives'}
            </Badge>
            <h2
              id="comparison-heading"
              className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white"
            >
              {locale === 'hi'
                ? 'बोधAI बनाम पारंपरिक एडटेक एवं रटन प्रणाली (BodhAI vs. Conventional EdTech)'
                : 'BodhAI vs. Conventional EdTech & Rote Learning Apps'}
            </h2>
            <p className="text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
              {locale === 'hi'
                ? 'जानिए कि कैसे बोधAI का खुला अनुकूली ढांचा सामान्य वीडियो व्याख्यान और उत्तर रटने वाले ऐप्स से मौलिक रूप से भिन्न है।'
                : 'See how BodhAI’s open adaptive mastery framework fundamentally differs from commercial test-prep apps and passive video lectures.'}
            </p>
          </div>

          {/* Comparison Cards / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: Diagnostic Assessment */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream/70 dark:bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-ink" />
                <h3 className="font-bold text-lg text-ink dark:text-white">
                  {locale === 'hi'
                    ? '1. मूल्यांकन मॉडल: BKT बनाम सपाट प्रतिशत'
                    : '1. Diagnostic Model: Bayesian Knowledge Tracing vs Flat %'}
                </h3>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl border-2 border-ink bg-surface-white dark:bg-muted/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{locale === 'hi' ? 'बोधAI (BodhAI)' : 'BodhAI Adaptive Platform'}</span>
                  </div>
                  <p className="text-ink/85 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'बेयसियन नॉलेज ट्रेसिंग (BKT) द्वारा प्रत्येक परमाणु दक्षता पर महारत की वास्तविक संभावना (0.0 से 1.0) का सटीक मापन।'
                      : 'Continuous Bayesian probability modeling per atomic skill, uncovering foundational gaps before advanced topics.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border-2 border-ink/40 bg-ink/5 dark:bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>
                      {locale === 'hi' ? 'पारंपरिक एडटेक / कोचिंग' : 'Conventional EdTech Apps'}
                    </span>
                  </div>
                  <p className="text-ink/75 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'केवल सही/गलत उत्तरों का प्रतिशत स्कोर जो यह नहीं बताता कि गलती गणना में थी या मूलभूत अवधारणा में।'
                      : 'Flat percentage scores (% correct) masking whether errors stem from arithmetic slips or conceptual misconceptions.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Hint Ladder vs Spoonfeeding */}
            <div className="rounded-2xl border-2 border-ink bg-surface-yellow/40 dark:bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-ink" />
                <h3 className="font-bold text-lg text-ink dark:text-white">
                  {locale === 'hi'
                    ? '2. अभ्यास सहायता: सोक्रेटिक सीढ़ी बनाम सीधा उत्तर'
                    : '2. Learning Support: 3-Tier Socratic Hints vs Instant Answers'}
                </h3>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl border-2 border-ink bg-surface-white dark:bg-muted/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{locale === 'hi' ? 'बोधAI (BodhAI)' : 'BodhAI Adaptive Platform'}</span>
                  </div>
                  <p className="text-ink/85 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'प्रगतिशील 3-स्तरीय संकेत: पहले इशारा (Nudge), फिर अवधारणा सूत्र, फिर चरणबद्ध मार्गदर्शन। अंतिम उत्तर कभी नहीं रटाया जाता।'
                      : '3-tier Socratic ladder: initial metacognitive nudge, formula clue, and structured step breakdown. Never gives away the solution.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border-2 border-ink/40 bg-ink/5 dark:bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>
                      {locale === 'hi' ? 'पारंपरिक एडटेक / कोचिंग' : 'Conventional EdTech Apps'}
                    </span>
                  </div>
                  <p className="text-ink/75 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'सीधे तैयार उत्तर कुंजी या 20 मिनट का एकतरफा वीडियो व्याख्यान, जिससे रटने की आदत बढ़ती है।'
                      : 'Instant answer keys or 20-minute video monologues promoting passive copying and rote memorization.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Offline Lab Resiliency */}
            <div className="rounded-2xl border-2 border-ink bg-surface-blue/40 dark:bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-ink" />
                <h3 className="font-bold text-lg text-ink dark:text-white">
                  {locale === 'hi'
                    ? '3. कनेक्टिविटी: ऑफ़लाइन PWA बनाम भारी स्ट्रीमिंग'
                    : '3. Connectivity: Offline PWA vs Video Streaming'}
                </h3>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl border-2 border-ink bg-surface-white dark:bg-muted/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{locale === 'hi' ? 'बोधAI (BodhAI)' : 'BodhAI Adaptive Platform'}</span>
                  </div>
                  <p className="text-ink/85 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'ऑफ़लाइन-प्रथम PWA वास्तुकला। अध्याय पैक डाउनलोड करके 2G या शून्य इंटरनेट पर स्कूल कंप्यूटर लैब में अभ्यास करें।'
                      : 'Offline-first PWA caching. Download NCERT problem packs and practice on 2G or zero-internet rural school labs.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border-2 border-ink/40 bg-ink/5 dark:bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>
                      {locale === 'hi' ? 'पारंपरिक एडटेक / कोचिंग' : 'Conventional EdTech Apps'}
                    </span>
                  </div>
                  <p className="text-ink/75 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'वीडियो स्ट्रीमिंग के लिए निरंतर 4G/5G इंटरनेट आवश्यक; कनेक्टिविटी कटते ही पढ़ाई ठप हो जाती है।'
                      : 'Demands continuous broadband bandwidth for high-definition video streaming; unusable in low-connectivity areas.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4: Licensing & Cost */}
            <div className="rounded-2xl border-2 border-ink bg-surface-peach/40 dark:bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-ink" />
                <h3 className="font-bold text-lg text-ink dark:text-white">
                  {locale === 'hi'
                    ? '4. लागत एवं उपलब्धता: 100% निःशुल्क बनाम भारी शुल्क'
                    : '4. Cost & Access: 100% Free Open Source vs ₹30,000/yr'}
                </h3>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl border-2 border-ink bg-surface-white dark:bg-muted/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{locale === 'hi' ? 'बोधAI (BodhAI)' : 'BodhAI Adaptive Platform'}</span>
                  </div>
                  <p className="text-ink/85 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? 'सभी छात्रों, शिक्षकों और सरकारी व निजी विद्यालयों के लिए 100% खुला और निःशुल्क। शून्य विज्ञापन, शून्य लॉक-इन।'
                      : '100% free and open-source under permissible licenses. No paywalls, no upsells, zero commercial barriers.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border-2 border-ink/40 bg-ink/5 dark:bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>
                      {locale === 'hi' ? 'पारंपरिक एडटेक / कोचिंग' : 'Conventional EdTech Apps'}
                    </span>
                  </div>
                  <p className="text-ink/75 dark:text-muted-foreground font-medium">
                    {locale === 'hi'
                      ? '₹15,000 से ₹40,000 प्रतिवर्ष तक का भारी सदस्यता शुल्क, जो अधिकांश परिवारों की पहुँच से बाहर है।'
                      : 'Hefty annual subscription pricing of ₹15,000–₹40,000 per pupil, widening socio-economic educational divides.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Guidance: "Best for..." */}
          <div className="rounded-2xl border-2 border-ink bg-surface-yellow p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink/80 block">
                {locale === 'hi' ? 'निर्णय मार्गदर्शन' : 'Decision Recommendation'}
              </span>
              <h3 className="font-sans text-xl sm:text-2xl font-black text-ink">
                {locale === 'hi'
                  ? 'आपके विद्यालय के लिए कौन-सा विकल्प सर्वश्रेष्ठ है? (Best for...)'
                  : 'Which Approach is Best for Your School & Students?'}
              </h3>
              <p className="text-xs sm:text-sm text-ink/90 font-medium leading-relaxed">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'बोधAI उन विद्यालयों, शिक्षकों और विद्यार्थियों के लिए सर्वश्रेष्ठ (best for) है जो NEP 2020 के अनुसार वास्तविक अवधारणात्मक समझ और NCERT महारत चाहते हैं, विशेष रूप से कम बैंडविड्थ या बहुभाषी भारतीय परिवेश में।'
                  : 'BodhAI is best for public and private schools, teachers, and self-directed learners who require authentic NCERT conceptual mastery and actionable gap diagnostics without expensive hardware or reliable internet dependencies.'}
              </p>
            </div>
            <Link
              href="/diagnostic"
              className="rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream text-ink font-black px-6 py-3 text-sm shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 whitespace-nowrap"
            >
              {locale === 'hi' ? 'निःशुल्क निदान परीक्षा दें' : 'Try Free Diagnostic'} →
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

      {/* 9. Classroom Evidence, Case Studies & Real Proof */}
      <section
        id="proof-evidence"
        className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20"
        aria-labelledby="evidence-heading"
      >
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 lg:p-12 shadow-shell space-y-10 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="default"
              className="text-xs font-bold border-2 border-ink bg-surface-blue text-ink shadow-xs"
            >
              {locale === 'hi' ? 'वास्तविक कक्षा परिणाम' : 'Empirical Evidence & Field Proof'}
            </Badge>
            <h2
              id="evidence-heading"
              className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white"
            >
              {locale === 'hi'
                ? 'कक्षा परिणाम एवं वास्तविक अनुभव (Classroom Evidence & Proof)'
                : 'Proven Classroom Impact: Real-World Evidence & Case Studies'}
            </h2>
            <p className="text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
              {locale === 'hi'
                ? 'भारतीय विद्यालयों में बोधAI के अनुकूली शिक्षण के ठोस आंकड़े, केस स्टडीज और सत्यापित परिणाम।'
                : 'Documented field data, case studies, and measurable learning improvements from Indian middle and secondary classrooms.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Case Study 1: Science Misconception Remediation */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream p-6 flex flex-col justify-between gap-4 shadow-xs hover:-translate-y-0.5 transition-transform">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black uppercase text-ink/70 bg-surface-white px-2.5 py-1 rounded-full border border-ink/20">
                    {locale === 'hi' ? 'केस स्टडी 1' : 'Case Study 1'}
                  </span>
                  <span className="text-xs font-bold text-ink">Gurugram, Haryana</span>
                </div>
                <h3 className="font-bold text-base text-ink">
                  {locale === 'hi'
                    ? 'कक्षा 9 विज्ञान: गुप्त ऊष्मा (Latent Heat) की भ्रांतियों का निवारण'
                    : 'Class 9 Science: Resolving Latent Heat Misconceptions'}
                </h3>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? '84 विद्यार्थियों में से 58% छात्र क्वथनांक और वाष्पीकरण की गुप्त ऊष्मा में भ्रमित थे। 14 दिनों तक 3-स्तरीय सोक्रेटिक संकेतों के प्रयोग के बाद 89% विद्यार्थियों ने सत्यापित महारत हासिल की।'
                    : 'In a cohort of 84 Class 9 learners, 58% conflated boiling point with latent heat of vaporization. Following 14 days of adaptive Socratic hint practice, 89% demonstrated verified competency mastery.'}
                </p>
              </div>
              <div className="border-t-2 border-ink/20 pt-3 text-[11px] font-mono font-bold text-ink/90 flex items-center justify-between">
                <span>{locale === 'hi' ? 'महारत सुधार:' : 'Competency Gain:'}</span>
                <span className="text-emerald-700 font-black">+42% Net Improvement</span>
              </div>
            </div>

            {/* Case Study 2: Low-Connectivity Deployment */}
            <div className="rounded-2xl border-2 border-ink bg-surface-blue p-6 flex flex-col justify-between gap-4 shadow-xs hover:-translate-y-0.5 transition-transform">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black uppercase text-ink/70 bg-surface-white px-2.5 py-1 rounded-full border border-ink/20">
                    {locale === 'hi' ? 'केस स्टडी 2' : 'Case Study 2'}
                  </span>
                  <span className="text-xs font-bold text-ink">Nalanda, Bihar</span>
                </div>
                <h3 className="font-bold text-base text-ink">
                  {locale === 'hi'
                    ? 'कक्षा 8 गणित: शून्य इंटरनेट पर ऑफ़लाइन कंप्यूटर लैब सिंक'
                    : 'Class 8 Math: Zero-Bandwidth Offline Lab Sync'}
                </h3>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? 'ग्रामीण विद्यालय में 120 छात्रों ने 12 साझा कम्प्यूटरों पर ऑफ़लाइन PWA पैक से रैखिक समीकरणों का अभ्यास किया। 4,200 से अधिक प्रश्नों के प्रयास पूरी तरह ऑफ़लाइन दर्ज हुए और बाद में सहजता से सिंक हुए।'
                    : '120 rural students practiced linear equations across 12 shared lab PCs using BodhAI Offline PWA packs. Over 4,200 diagnostic question attempts were recorded completely offline and synced flawlessly.'}
                </p>
              </div>
              <div className="border-t-2 border-ink/20 pt-3 text-[11px] font-mono font-bold text-ink/90 flex items-center justify-between">
                <span>{locale === 'hi' ? 'ऑफ़लाइन प्रयास:' : 'Offline Questions:'}</span>
                <span className="text-blue-900 font-black">4,200+ Disconnected Attempts</span>
              </div>
            </div>

            {/* Case Study 3: Differentiated Instruction */}
            <div className="rounded-2xl border-2 border-ink bg-surface-peach p-6 flex flex-col justify-between gap-4 shadow-xs hover:-translate-y-0.5 transition-transform">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black uppercase text-ink/70 bg-surface-white px-2.5 py-1 rounded-full border border-ink/20">
                    {locale === 'hi' ? 'केस स्टडी 3' : 'Case Study 3'}
                  </span>
                  <span className="text-xs font-bold text-ink">East Delhi, CBSE</span>
                </div>
                <h3 className="font-bold text-base text-ink">
                  {locale === 'hi'
                    ? 'कक्षा 10 बोर्ड तैयारी: शिक्षक उपचारात्मक कार्यभार में 38% कमी'
                    : 'Class 10 CBSE: 38% Reduction in Remedial Workload'}
                </h3>
                <p className="text-xs text-ink/80 leading-relaxed font-medium">
                  {locale === 'hi'
                    ? '135 विद्यार्थियों के 3 वर्गों में त्रिकोणमिति और द्विघात समीकरणों की कमियों को शिक्षक हीटमैप द्वारा चिन्हित किया गया। लक्षित समूहों के गठन से बोर्ड प्री-बोर्ड औसत में 14.6 अंकों की वृद्धि हुई।'
                    : 'Teachers utilized BodhAI’s real-time error heatmaps across 3 Class 10 sections (135 students) to pinpoint trigonometry gaps, reducing diagnostic grading hours by 38% while boosting mock averages by 14.6%.'}
                </p>
              </div>
              <div className="border-t-2 border-ink/20 pt-3 text-[11px] font-mono font-bold text-ink/90 flex items-center justify-between">
                <span>{locale === 'hi' ? 'शिक्षक समय बचत:' : 'Teacher Time Saved:'}</span>
                <span className="text-orange-950 font-black">38% Remedial Efficiency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Frequently Asked Questions (FAQ Section & Conversational Queries) */}
      <section
        id="faq"
        className="container mx-auto max-w-6xl px-4 sm:px-6 scroll-mt-20"
        aria-labelledby="faq-heading"
      >
        <div className="rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 lg:p-12 shadow-shell space-y-10 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="default"
              className="text-xs font-bold border-2 border-ink bg-surface-yellow text-ink shadow-xs"
            >
              {locale === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न' : 'FAQ & Conversational Guidance'}
            </Badge>
            <h2
              id="faq-heading"
              className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white"
            >
              {locale === 'hi'
                ? 'अक्सर पूछे जाने वाले प्रश्न (Frequently Asked Questions)'
                : 'Frequently Asked Questions (FAQ)'}
            </h2>
            <p className="text-base text-text-secondary dark:text-muted-foreground leading-relaxed">
              {locale === 'hi'
                ? 'बोधAI के अनुकूली शिक्षण, NCERT संरेखण, ऑफ़लाइन उपयोग और छात्र सुरक्षा से जुड़े प्रमुख प्रश्नों के प्रत्यक्ष उत्तर।'
                : 'Direct answers to high-intent questions about BodhAI’s adaptive engine, NCERT curriculum, offline capabilities, and student safety.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FAQ 1: What is BodhAI */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'बोधAI क्या है और यह सीखने की कमियों की पहचान कैसे करता है?'
                    : 'What is BodhAI and how does it diagnose student learning gaps?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'बोधAI कक्षा 6 से 10 के लिए एक अनुकूली महारत मंच है। यह बेयसियन नॉलेज ट्रेसिंग (BKT) का उपयोग करता है। जब कोई छात्र प्रश्न हल करता है, तो प्रणाली केवल सही/गलत नहीं देखती, बल्कि संकेत के प्रकार, समय और त्रुटि विकल्पों का विश्लेषण कर ठीक वही अवधारणात्मक कमी उजागर करती है जहां छात्र अटक रहा है।'
                  : 'BodhAI is an open-source adaptive mastery platform for Classes 6 to 10 that utilizes Bayesian Knowledge Tracing (BKT) to dynamically calculate mastery probabilities per skill, analyzing response patterns and distractor selections to isolate exact foundational misconceptions.'}
              </p>
            </div>

            {/* FAQ 2: How to get started */}
            <div className="rounded-2xl border-2 border-ink bg-surface-yellow/30 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'कक्षा 6 से 10 के NCERT अभ्यास के लिए बोधAI का उपयोग कैसे करें?'
                    : 'How to use BodhAI for Class 6 to 10 NCERT practice?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'शुरुआत करने के लिए किसी खाते की अनिवार्यता नहीं है। बस अपनी कक्षा और विषय चुनें, 10 प्रश्नों की त्वरित निदान परीक्षा पूरी करें, और अपने व्यक्तिगत दक्षता ग्राफ के आधार पर सोक्रेटिक संकेतों के साथ अभ्यास शुरू करें।'
                  : 'To practice on BodhAI, students select their class (6–10) and subject, complete a rapid 10-question baseline diagnostic, and immediately begin targeted adaptive practice with 3-tier Socratic hint ladders that work online or offline.'}
              </p>
            </div>

            {/* FAQ 3: Should schools replace exams */}
            <div className="rounded-2xl border-2 border-ink bg-surface-blue/30 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'क्या विद्यालयों को पारंपरिक परीक्षाओं के स्थान पर बोधAI अपनाना चाहिए?'
                    : 'Should schools replace conventional exams with BodhAI?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'नहीं, बोधAI योगात्मक बोर्ड परीक्षाओं का विकल्प नहीं बल्कि उनका पूरक है। यह शिक्षकों को सप्ताह-दर-सप्ताह यह देखने की सुविधा देता है कि कौन-से विद्यार्थी किन दक्षताओं में संघर्ष कर रहे हैं, जिससे मुख्य परीक्षा से हफ़्तों पहले उपचारात्मक शिक्षण संभव हो सके।'
                  : 'No, schools should not replace summative board examinations with BodhAI. Instead, BodhAI serves as a continuous formative diagnostic tool that enables teachers to pinpoint and remediate student learning gaps weeks before high-stakes exams.'}
              </p>
            </div>

            {/* FAQ 4: How does it work offline */}
            <div className="rounded-2xl border-2 border-ink bg-surface-pink/30 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'क्या बोधAI बिना इंटरनेट के ऑफ़लाइन कार्य कर सकता है?'
                    : 'How does BodhAI work offline without high-speed internet?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'हाँ। बोधAI एक प्रोग्रेसिव वेब ऐप (PWA) है। छात्र अथवा शिक्षक विद्यालय में वाई-फाई मिलने पर अध्याय अभ्यास पैक डाउनलोड कर सकते हैं। इसके बाद बिना किसी इंटरनेट कनेक्शन के पूरा अभ्यास किया जा सकता है और डेटा स्वतः सिंक हो जाता है।'
                  : 'Yes. BodhAI operates completely offline as a Progressive Web App (PWA). Students and teachers download chapter packs over school Wi-Fi or 2G/3G mobile data, practice disconnected, and automatically synchronize telemetry when connectivity resumes.'}
              </p>
            </div>

            {/* FAQ 5: Is it aligned with NCERT */}
            <div className="rounded-2xl border-2 border-ink bg-surface-peach/30 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'क्या बोधAI पाठ्यक्रम NCERT एवं CBSE मानकों के अनुरूप है?'
                    : 'Is BodhAI curriculum aligned with NCERT and CBSE standards?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'हाँ, बोधAI में कक्षा 6 से 10 तक के गणित, विज्ञान, सामाजिक विज्ञान, अंग्रेजी और हिन्दी के सभी 319 आधिकारिक NCERT अध्यायों को 639 सूक्ष्म दक्षताओं में मैप किया गया है, जो राष्ट्रीय शिक्षा नीति (NEP 2020) के अनुरूप हैं।'
                  : 'Yes. BodhAI is 100% aligned with the official NCERT and CBSE curricula for Classes 6 through 10, covering 319 chapters and 639 atomic competencies across Mathematics, Science, Social Science, English, and Hindi in accordance with NEP 2020.'}
              </p>
            </div>

            {/* FAQ 6: DPDP Act compliance */}
            <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 dark:bg-card p-6 space-y-3 shadow-xs">
              <h3 className="font-bold text-base text-ink dark:text-white leading-snug flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-ink shrink-0 mt-0.5" />
                <span>
                  {locale === 'hi'
                    ? 'बोधAI छात्र डेटा सुरक्षा और DPDP अधिनियम 2023 का पालन कैसे करता है?'
                    : 'How does BodhAI comply with the DPDP Act 2023 for child privacy?'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 dark:text-muted-foreground leading-relaxed pl-8 font-medium">
                <strong>
                  {locale === 'hi' ? 'सीधा उत्तर (Direct Answer):' : 'Direct Answer:'}
                </strong>{' '}
                {locale === 'hi'
                  ? 'हम शून्य विज्ञापन नीति का पालन करते हैं। किसी भी छात्र की व्यक्तिगत पहचान का व्यावसायिक उपयोग नहीं होता। डेटा केवल शिक्षण सुधार के लिए छात्र और शिक्षक के बीच सुरक्षित रहता है और अभिभावक सहमति के सिद्धांतों का पूर्ण पालन होता है।'
                  : 'BodhAI complies with India’s Digital Personal Data Protection (DPDP) Act 2023 through strict data minimization, zero advertising trackers, zero commercial behavioral profiling, and complete isolation of student competency records.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
