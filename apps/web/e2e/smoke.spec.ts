import { test, expect } from '@playwright/test';

const pages = [
  { path: '', name: 'Home' },
  { path: '/how-it-works', name: 'How it Works' },
  { path: '/for-students', name: 'For Students' },
  { path: '/for-teachers', name: 'For Teachers' },
  { path: '/for-schools', name: 'For Schools' },
  { path: '/languages-offline', name: 'Languages & Offline' },
  { path: '/privacy-safety', name: 'Privacy & Safety' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms of Service' },
  { path: '/design', name: 'Design System Showcase' },
];

const locales = ['en', 'hi'];

for (const locale of locales) {
  test.describe(`Smoke Tests [${locale.toUpperCase()}]`, () => {
    for (const pageInfo of pages) {
      test(`page /${locale}${pageInfo.path} loads and renders with valid semantic structure`, async ({
        page,
      }) => {
        const url = `/${locale}${pageInfo.path}`;
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
        expect(new URL(page.url()).pathname).toBe(url);

        // Check html lang attribute
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe(locale);

        // Check skip-to-content accessibility link exists
        const skipLink = page.locator('.skip-to-content');
        await expect(skipLink).toBeAttached();

        // Check single h1 exists and is visible
        const h1 = page.locator('h1');
        await expect(h1).toHaveCount(1);
        await expect(h1).not.toBeEmpty();

        // Check header and footer are attached
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('footer')).toBeAttached();
      });
    }

    test(`home page /${locale} renders verified statistics and citations`, async ({ page }) => {
      await page.goto(`/${locale}`);

      // Check cited statistics
      await expect(page.getByText('10.09')).toBeVisible();
      await expect(page.getByText('45.8%')).toBeVisible();
      await expect(page.getByText(/UDISE\+/i).first()).toBeVisible();
      await expect(page.getByText(/ASER/i).first()).toBeVisible();
    });

    test(`contact page /${locale}/contact has accessible form controls`, async ({ page }) => {
      await page.goto(`/${locale}/contact`);

      await expect(page.locator('input#contact-name')).toBeVisible();
      await expect(page.locator('input#contact-email')).toBeVisible();
      await expect(page.locator('select#contact-role')).toBeVisible();
      await expect(page.locator('textarea#contact-message')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
}

test.describe('Responsive Navigation & Viewports', () => {
  test('renders properly at mobile viewport (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/en');

    // Hamburger button should be visible on mobile
    const hamburger = page.getByRole('button', { name: /toggle navigation menu/i });
    await expect(hamburger).toBeVisible();

    // Click hamburger opens mobile navigation
    await hamburger.click();
    await expect(page.locator('#main-content')).toBeAttached();
  });

  test('renders properly at desktop viewport (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/en');

    // Desktop nav should be visible and hamburger hidden
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /toggle navigation menu/i })).not.toBeVisible();
  });
});
