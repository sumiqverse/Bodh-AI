import type { Metadata } from 'next';
import { Inter, Lora, Noto_Sans_Devanagari } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/query-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ToastProvider } from '@bodhai/ui';
import { ServiceWorkerRegister } from '@/components/offline';
import 'katex/dist/katex.min.css';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-devanagari',
  display: 'swap',
});

import { getBaseUrl } from '@/lib/site-url';

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = getBaseUrl();
  const canonicalPath = `/${locale}`;

  return {
    manifest: '/manifest.json',
    metadataBase: new URL(baseUrl),
    icons: {
      icon: [
        { url: '/icons/image.webp', type: 'image/webp' },
        { url: '/icons/image.png', type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      shortcut: '/favicon.ico',
      apple: [{ url: '/icons/image.webp', sizes: '180x180', type: 'image/webp' }],
    },
    title: {
      default: 'BodhAI (बोधAI) — Adaptive Mastery Learning for Classes 6–10 in India',
      template: '%s | BodhAI',
    },
    description:
      locale === 'hi'
        ? 'कक्षा 6 से 10 के छात्रों के लिए NCERT संरेखित व्यक्तिगत अनुकूली नैदानिक मूल्यांकन और महारत शिक्षण मंच।'
        : 'BodhAI is an adaptive diagnostic and mastery learning platform built specifically for Classes 6–10 across India, aligned with NCERT curriculum frameworks.',
    keywords: [
      'BodhAI',
      'Adaptive Learning',
      'NCERT',
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
      'Education India',
      'CBSE',
      'Diagnostic Assessment',
    ],
    authors: [{ name: 'BodhAI Pedagogical Engineering Team' }],
    creator: 'BodhAI Foundation',
    openGraph: {
      type: 'website',
      locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
      url: `${baseUrl}/${locale}`,
      siteName: 'BodhAI (बोधAI)',
      title: 'BodhAI — Adaptive Mastery Learning for Classes 6–10',
      description:
        locale === 'hi'
          ? 'कक्षा 6 से 10 के छात्रों के लिए व्यक्तिगत अनुकूली नैदानिक मूल्यांकन और महारत शिक्षण मंच।'
          : 'Personalized diagnostic assessments and mastery learning for middle and high school students in India.',
      images: [
        {
          url: `${baseUrl}/icons/image.png`,
          width: 1200,
          height: 630,
          alt: 'BodhAI — Adaptive Mastery Learning for Classes 6 to 10 in India',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'BodhAI — Adaptive Learning for Classes 6–10',
      description:
        locale === 'hi'
          ? 'भारतीय विद्यालयों के लिए द्विभाषी अनुकूली नैदानिक शिक्षण।'
          : 'Bilingual adaptive diagnostic learning for Indian schools.',
      images: [`${baseUrl}/icons/image.png`],
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: '/en',
        hi: '/hi',
        'x-default': '/en',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const baseUrl = getBaseUrl();

  // Comprehensive JSON-LD Schemas for SEO & Semantic Web
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': `${baseUrl}/#organization`,
    name: 'BodhAI Foundation',
    alternateName: ['बोधAI', 'BodhAI Educational Technologies'],
    url: baseUrl,
    logo: `${baseUrl}/icons/image.webp`,
    image: `${baseUrl}/icons/image.webp`,
    description:
      'Open-source adaptive diagnostic mastery learning platform for Classes 6 to 10 across India, aligned with NCERT curriculum frameworks.',
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    sameAs: [
      'https://en.wikipedia.org/wiki/National_Council_of_Educational_Research_and_Training',
      'https://www.wikidata.org/wiki/Q11068875',
      'https://github.com/bodhai-org/bodhai',
      'https://twitter.com/bodhai_edu',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Pedagogical & Technical Inquiries',
      email: 'contact@bodhai.org.in',
      availableLanguage: ['English', 'Hindi'],
    },
    educationalCredentialAwarded: 'NCERT Competency Mastery Evaluation',
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${baseUrl}/${locale}#webpage`,
    url: `${baseUrl}/${locale}`,
    name:
      locale === 'hi'
        ? 'बोधAI — कक्षा 6 से 10 के लिए अनुकूली महारत अधिगम'
        : 'BodhAI — Adaptive Mastery Learning for Middle & Secondary School',
    description:
      'BodhAI is an open-source, NCERT-aligned adaptive diagnostic and mastery learning platform for Classes 6–10 across India.',
    inLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: 'BodhAI',
      url: baseUrl,
    },
    about: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'BodhAI Foundation',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'BodhAI Foundation',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icons/image.webp`,
      },
    },
    author: {
      '@type': 'Organization',
      name: 'BodhAI Foundation',
      url: baseUrl,
    },
    datePublished: '2026-01-15T00:00:00+05:30',
    dateModified: '2026-11-04T00:00:00+05:30',
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'hi' ? 'गृह' : 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'hi' ? 'दक्षता अधिगम' : 'Mastery Learning',
        item: `${baseUrl}/${locale}`,
      },
    ],
  };

  const graphJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd, webPageJsonLd, breadcrumbJsonLd],
  };

  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable} ${notoDevanagari.variable}`}
    >
      <head>
        <link rel="preload" as="image" href="/icons/image.webp" type="image/webp" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graphJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </head>
      <body className="min-h-screen font-sans bg-background text-foreground antialiased flex flex-col">
        <a href="#main-content" className="skip-to-content">
          {locale === 'hi' ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'}
        </a>

        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <ToastProvider>
                <ServiceWorkerRegister />
                <div className="flex min-h-screen flex-col">
                  <SiteHeader />
                  <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
                    {children}
                  </main>
                  <SiteFooter />
                </div>
              </ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
