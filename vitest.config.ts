import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/web/vitest.config.ts',
      'packages/ui/vitest.config.ts',
      'packages/engine-ts/vitest.config.ts',
      'packages/api-client/vitest.config.ts',
    ],
  },
});
