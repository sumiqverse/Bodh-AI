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

export const metadata: Metadata = {
  manifest: '/manifest.json',
  metadataBase: new URL('https://bodhai.org.in'),
  icons: {
    icon: [
      { url: '/image.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/image.png', sizes: '180x180', type: 'image/png' }],
  },
  title: {
    default: 'BodhAI (बोधAI) — Adaptive Mastery Learning for Classes 6–10 in India',
    template: '%s | BodhAI',
  },
  description:
    'BodhAI is an adaptive diagnostic and mastery learning platform built specifically for Classes 6–10 across India, aligned with NCERT curriculum frameworks.',
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
    locale: 'en_IN',
    url: 'https://bodhai.org.in',
    siteName: 'BodhAI (बोधAI)',
    title: 'BodhAI — Adaptive Mastery Learning for Classes 6–10',
    description:
      'Personalized diagnostic assessments and mastery learning for middle and high school students in India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BodhAI — Adaptive Learning for Classes 6–10',
    description: 'Bilingual adaptive diagnostic learning for Indian schools.',
  },
  alternates: {
    canonical: '/',
    languages: {
      en: '/en',
      hi: '/hi',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

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

  // JSON-LD Organization Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'BodhAI Foundation',
    alternateName: 'बोधAI',
    url: 'https://bodhai.org.in',
    logo: 'https://bodhai.org.in/logo.png',
    description:
      'Adaptive diagnostic learning platform for Classes 6 to 10 in India aligned with NCERT standards.',
    areaServed: 'IN',
    educationalCredentialAwarded: 'Curriculum Competency Mastery',
  };

  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable} ${notoDevanagari.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
