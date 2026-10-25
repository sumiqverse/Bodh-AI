import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bodhai.org.in';
  const routes = [
    '',
    '/how-it-works',
    '/for-students',
    '/for-teachers',
    '/for-schools',
    '/languages-offline',
    '/privacy-safety',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/en${route}`,
            hi: `${baseUrl}/hi${route}`,
          },
        },
      });
    }
  }

  return entries;
}
