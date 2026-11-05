import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '@/middleware';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { GET as getLlmsTxt } from '@/app/llms.txt/route';
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  publicPageMetadata,
  webPageJsonLd,
} from '@/lib/seo';
import { getPublicPageFaqs, PUBLIC_FAQ_PATHS } from '@/lib/public-page-faqs';

describe('public page metadata', () => {
  it('uses a self canonical and matching language alternates for an inner page', () => {
    const metadata = publicPageMetadata({
      locale: 'hi',
      path: 'for-students',
      title: 'विद्यार्थियों के लिए',
      description: 'सीखने का विवरण',
    });

    expect(metadata.alternates).toEqual({
      canonical: '/hi/for-students',
      languages: {
        en: '/en/for-students',
        hi: '/hi/for-students',
        'x-default': '/en/for-students',
      },
    });
    expect(metadata.openGraph).toMatchObject({
      title: 'विद्यार्थियों के लिए',
      description: 'सीखने का विवरण',
      alternateLocale: ['en_IN'],
    });
    expect(metadata.openGraph?.url).toMatch(/\/hi\/for-students$/);
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('keeps the landing URL canonical to its own locale', () => {
    const metadata = publicPageMetadata({
      locale: 'en',
      path: '',
      title: 'BodhAI',
      description: 'Adaptive learning',
    });

    expect(metadata.alternates?.canonical).toBe('/en');
    expect(metadata.openGraph?.url).toMatch(/\/en$/);
  });
});

describe('structured data', () => {
  it('builds a page, breadcrumb, FAQ, and HowTo graph with stable IDs', () => {
    const page = webPageJsonLd({
      locale: 'en',
      path: 'how-it-works',
      name: 'How it works',
      description: 'Adaptive learning flow',
      type: 'WebPage',
    }) as { '@id': string; isPartOf: { '@id': string } };
    const breadcrumb = breadcrumbJsonLd({
      locale: 'en',
      path: 'how-it-works',
      name: 'How it works',
    }) as { itemListElement: unknown[] };
    const faq = faqPageJsonLd([
      { question: 'What is BodhAI?', answer: 'An adaptive learning platform.' },
    ]) as { mainEntity: Array<Record<string, unknown>> };
    const howTo = howToJsonLd({
      locale: 'en',
      path: 'how-it-works',
      name: 'How BodhAI works',
      description: 'Adaptive learning flow',
      steps: [{ name: 'Diagnose', text: 'Find the prerequisite gap.' }],
    }) as { step: Array<Record<string, unknown>> };

    expect(page['@id']).toMatch(/\/en\/how-it-works#webpage$/);
    expect(page.isPartOf).toEqual({ '@id': expect.stringMatching(/#website$/) });
    expect(breadcrumb.itemListElement).toHaveLength(2);
    expect(faq.mainEntity).toHaveLength(1);
    expect(faq.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'What is BodhAI?',
    });
    expect(howTo.step).toHaveLength(1);
    expect(howTo.step[0]).toMatchObject({ '@type': 'HowToStep', position: 1 });
  });
});

describe('answer-engine FAQ content', () => {
  it('has at least three concrete answers for every indexable page in both languages', () => {
    for (const path of PUBLIC_FAQ_PATHS) {
      const english = getPublicPageFaqs('en', path);
      const hindi = getPublicPageFaqs('hi', path);

      expect(english.length, `${path} English FAQ count`).toBeGreaterThanOrEqual(3);
      expect(hindi.length, `${path} Hindi FAQ count`).toBeGreaterThanOrEqual(3);
      expect(english.every((item) => item.question && item.answer)).toBe(true);
      expect(hindi.every((item) => item.question && item.answer)).toBe(true);
    }
  });

  it('returns an empty list for a non-public path', () => {
    expect(getPublicPageFaqs('en', 'privacy-policy')).toEqual([]);
  });
});

describe('sitemap', () => {
  it('lists localized public pages without private or draft legal URLs', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith('/en/for-students'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/hi/for-students'))).toBe(true);
    expect(urls.some((url) => /\/(student|admin|privacy-policy|terms)(?:\/|$)/.test(url))).toBe(
      false,
    );
    expect(entries.every((entry) => entry.alternates?.languages?.['x-default'])).toBe(true);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
  });
});

describe('crawler policy', () => {
  it('allows answer engines while keeping private application routes out of crawl paths', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const answerEngineRule = rules.find((rule) =>
      Array.isArray(rule.userAgent)
        ? rule.userAgent.includes('GPTBot')
        : rule.userAgent === 'GPTBot',
    );
    const generalRule = rules.find((rule) => rule.userAgent === '*');
    const disallow = Array.isArray(generalRule?.disallow)
      ? generalRule.disallow
      : [generalRule?.disallow];

    expect(answerEngineRule).toBeDefined();
    expect(disallow).toContain('/en/admin');
    expect(disallow).toContain('/hi/student');
    expect(config.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('marks private and draft legal routes noindex while leaving public pages indexable', () => {
    const privateResponse = middleware(
      new NextRequest('https://example.com/en/student', {
        headers: { cookie: 'bodhai_logged_in=true' },
      }),
    );
    const draftResponse = middleware(new NextRequest('https://example.com/hi/privacy-policy'));
    const publicResponse = middleware(new NextRequest('https://example.com/en/about'));

    expect(privateResponse.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(draftResponse.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(publicResponse.headers.get('X-Robots-Tag')).toBeNull();
  });
});

describe('llms.txt', () => {
  it('publishes a canonical, machine-readable page map', async () => {
    const response = getLlmsTxt();
    const text = await response.text();

    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(text).toContain('# BodhAI');
    expect(text).toContain('/en/for-students');
    expect(text).toContain('/en/privacy-safety');
    expect(text).not.toContain('/en/privacy-policy');
  });
});
