import type { Metadata } from 'next';
import { getBaseUrl } from './site-url';

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export type PublicPageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';

export interface HowToStep {
  readonly name: string;
  readonly text: string;
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

export function absolutePageUrl(locale: string, path: string): string {
  return `${getBaseUrl()}/${locale}${normalizePath(path)}`;
}

/** Metadata for public, localized pages. Each URL is its own canonical. */
export function publicPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const baseUrl = getBaseUrl();
  const suffix = normalizePath(path);
  const canonical = `/${locale}${suffix}`;
  const imageAlt = `BodhAI — ${title}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `/en${suffix}`,
        hi: `/hi${suffix}`,
        'x-default': `/en${suffix}`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'BodhAI',
      locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
      alternateLocale: [locale === 'hi' ? 'en_IN' : 'hi_IN'],
      url: `${baseUrl}${canonical}`,
      title,
      description,
      images: [{ url: `${baseUrl}/icons/image.webp`, width: 1254, height: 1254, alt: imageAlt }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [{ url: `${baseUrl}/icons/image.webp`, alt: imageAlt }],
    },
  };
}

export function webPageJsonLd({
  locale,
  path,
  name,
  description,
  type = 'WebPage',
}: {
  locale: string;
  path: string;
  name: string;
  description: string;
  type?: PublicPageType;
}): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  const url = absolutePageUrl(locale, path);

  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN',
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${baseUrl}/icons/image.webp`,
      width: 1254,
      height: 1254,
    },
  };
}

export function breadcrumbJsonLd({
  locale,
  path,
  name,
}: {
  locale: string;
  path: string;
  name: string;
}): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  const url = absolutePageUrl(locale, path);
  const homeName = locale === 'hi' ? 'होम' : 'Home';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeName,
        item: `${baseUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: url,
      },
    ],
  };
}

export function faqPageJsonLd(items: readonly FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function howToJsonLd({
  locale,
  path,
  name,
  description,
  steps,
  totalTime = 'PT15M',
}: {
  locale: string;
  path: string;
  name: string;
  description: string;
  steps: readonly HowToStep[];
  totalTime?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    inLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN',
    totalTime,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: `${absolutePageUrl(locale, path)}#step-${index + 1}`,
    })),
  };
}
