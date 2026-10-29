import { describe, expect, it } from 'vitest';
import { validateWebEnv } from '../lib/env';

describe('validateWebEnv', () => {
  it('returns valid default configuration when env is empty', () => {
    const config = validateWebEnv();
    expect(config.apiUrl).toBeDefined();
    expect(['development', 'staging', 'production', 'test']).toContain(config.appEnv);
    expect(typeof config.maintenanceMode).toBe('boolean');
    expect(typeof config.demoMode).toBe('boolean');
    expect(['en', 'hi']).toContain(config.defaultLocale);
  });

  it('correctly handles boolean strings for maintenance and demo modes', () => {
    const origMaint = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
    const origDemo = process.env.NEXT_PUBLIC_DEMO_MODE;

    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = 'true';
    process.env.NEXT_PUBLIC_DEMO_MODE = '1';

    const config = validateWebEnv();
    expect(config.maintenanceMode).toBe(true);
    expect(config.demoMode).toBe(true);

    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = origMaint;
    process.env.NEXT_PUBLIC_DEMO_MODE = origDemo;
  });
});
