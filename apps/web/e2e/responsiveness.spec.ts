import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1280]) {
  test(`public entry pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ['/en/login', '/en/join', '/en/signup']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
    }
  });
}
