import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getBaseUrl } from '@/lib/site-url';

// Sitemap dates should reflect a real content review, not every request. Update when
// public copy or structured data changes.
const LAST_CONTENT_REVIEW = new Date('2026-11-04T00:00:00.000Z');

const routes = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/for-students', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/for-teachers', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/for-schools', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/how-it-works', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/languages-offline', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/privacy-safety', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}${route.path}`,
        lastModified: LAST_CONTENT_REVIEW,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: {
            en: `${baseUrl}/en${route.path}`,
            hi: `${baseUrl}/hi${route.path}`,
            'x-default': `${baseUrl}/en${route.path}`,
          },
        },
      });
    }
  }

  return entries;
}
