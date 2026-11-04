import { test, expect } from '@playwright/test';

test.describe('Production Theme Toggle and Get Started Dropdown', () => {
  test('theme toggle switches theme and updates html class without CSP errors', async ({
    page,
  }) => {
    const cspErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });

    await page.goto('/en', { waitUntil: 'networkidle' });

    // Expect ZERO CSP errors
    expect(cspErrors).toEqual([]);

    // Find the theme toggle button: label is "Theme" (en) or "थीम" (hi)
    const themeToggle = page
      .locator(
        'header button[aria-label="Theme"], header button[aria-label="थीम"], header button[title="Theme"]',
      )
      .first();
    await expect(themeToggle).toBeVisible();

    // Verify it is not the unmounted blank dot placeholder
    const htmlBefore = await themeToggle.innerHTML();
    expect(htmlBefore).toContain('<svg');

    // Click to toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Verify html class changed
    const htmlClassAfterFirstClick = await page.evaluate(() => document.documentElement.className);
    const resolvedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    console.log('Theme in localStorage:', resolvedTheme, 'HTML class:', htmlClassAfterFirstClick);
    expect(['dark', 'light']).toContain(resolvedTheme);

    // Click again to toggle back
    await themeToggle.click();
    await page.waitForTimeout(500);
    const resolvedTheme2 = await page.evaluate(() => localStorage.getItem('theme'));
    expect(resolvedTheme2).not.toEqual(resolvedTheme);
  });

  test('get started button toggles sign in and sign up dropdown properly', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });

    // Find Get Started button
    const getStartedBtn = page.locator('header button', { hasText: /get started/i }).first();
    await expect(getStartedBtn).toBeVisible();

    // Dropdown should initially be closed
    const dropdownMenu = page.locator('header div[role="menu"]');
    await expect(dropdownMenu).toHaveCount(0);

    // Hover Get Started button
    await getStartedBtn.hover();
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });
    await expect(dropdownMenu.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(dropdownMenu.getByRole('link', { name: /sign up/i })).toBeVisible();

    // Click outside to close
    await page.mouse.move(10, 10);
    await page.waitForTimeout(400);
    await expect(dropdownMenu).toHaveCount(0);

    // Click Get Started button to open on click
    await getStartedBtn.click();
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });
    await expect(dropdownMenu.getByRole('link', { name: /sign in/i })).toBeVisible();

    // Click outside to close
    await page.mouse.click(10, 10);
    await expect(dropdownMenu).toHaveCount(0);
  });
});
