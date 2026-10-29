import { describe, expect, it } from 'vitest';
import { getFeatureFlags, isFeatureEnabled } from '../lib/feature-flags';

describe('Feature Flags Engine', () => {
  it('returns valid boolean dictionary for all known flags', () => {
    const flags = getFeatureFlags();
    expect(typeof flags.aiTutor).toBe('boolean');
    expect(typeof flags.offlineMode).toBe('boolean');
    expect(typeof flags.demoMode).toBe('boolean');
    expect(typeof flags.detailedDiagnostics).toBe('boolean');
    expect(typeof flags.feedbackForm).toBe('boolean');
  });

  it('checks individual flags using isFeatureEnabled', () => {
    expect(typeof isFeatureEnabled('aiTutor')).toBe('boolean');
    expect(typeof isFeatureEnabled('feedbackForm')).toBe('boolean');
    expect(typeof isFeatureEnabled('offlineMode')).toBe('boolean');
  });

  it('honors environment overrides correctly', () => {
    const orig = process.env.NEXT_PUBLIC_FEATURE_FLAGS;
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = 'demoMode,!aiTutor';

    expect(isFeatureEnabled('demoMode')).toBe(true);
    expect(isFeatureEnabled('aiTutor')).toBe(false);

    process.env.NEXT_PUBLIC_FEATURE_FLAGS = orig;
  });
});
