import { test as baseTest, expect } from '@playwright/test';

/**
 * Extended Playwright test runner with automated low-end Android emulation:
 * - 4x CPU slowdown via Chrome DevTools Protocol
 * - Slow 3G network conditions (400ms RTT latency, 400 kbps downlink/uplink)
 */
export const test = baseTest.extend({
  page: async ({ page, context }, use, testInfo) => {
    if (testInfo.project.name === 'low-end-android') {
      try {
        const client = await context.newCDPSession(page);
        // Emulate 4x CPU slowdown
        await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        // Emulate Slow 3G network conditions
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 400, // 400ms round-trip latency
          downloadThroughput: (400 * 1024) / 8, // 400 kbps downlink
          uploadThroughput: (400 * 1024) / 8, // 400 kbps uplink
          connectionType: 'cellular3g',
        });
      } catch (err) {
        // Non-Chromium engines do not expose CDP session
        console.warn('Low-end emulation CDP session skipped:', err);
      }
    }
    await use(page);
  },
});

export { expect };
