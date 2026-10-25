import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const auditRoutes = [
  '/',
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
  '/design',
];

for (const route of auditRoutes) {
  test(`a11y audit [EN]: ${route} conforms with WCAG 2.2 AA standards`, async ({ page }) => {
    await page.goto(`/en${route === '/' ? '' : route}`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test(`a11y audit [HI]: ${route} conforms with WCAG 2.2 AA standards`, async ({ page }) => {
    await page.goto(`/hi${route === '/' ? '' : route}`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
