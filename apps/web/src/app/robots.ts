import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getBaseUrl } from '@/lib/site-url';

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
  'Bytespider',
  'cohere-ai',
  'Diffbot',
];

const PRIVATE_ROUTE_PREFIXES = [
  '/admin',
  '/student',
  '/classes',
  '/profile',
  '/profiles',
  '/progress',
  '/settings',
  '/curriculum',
  '/solve',
  '/diagnostic',
  '/learn',
  '/test',
  '/certificate',
  '/login',
  '/signup',
  '/join',
  '/consent',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const disallow = routing.locales.flatMap((locale) =>
    PRIVATE_ROUTE_PREFIXES.map((route) => `/${locale}${route}`),
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
