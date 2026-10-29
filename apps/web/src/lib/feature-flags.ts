/**
 * Typed Feature Flags configuration and evaluation engine for BodhAI.
 * Allows safely gating experimental features, pilot modes, and offline functionality.
 */

import { env, type WebEnvConfig } from './env';

export type FeatureFlagKey =
  'aiTutor' | 'offlineMode' | 'demoMode' | 'detailedDiagnostics' | 'feedbackForm';

export interface FeatureFlagConfig {
  aiTutor: boolean;
  offlineMode: boolean;
  demoMode: boolean;
  detailedDiagnostics: boolean;
  feedbackForm: boolean;
}

/** Default flag configurations partitioned by environment */
const DEFAULT_FLAGS: Record<WebEnvConfig['appEnv'], FeatureFlagConfig> = {
  development: {
    aiTutor: true,
    offlineMode: true,
    demoMode: true,
    detailedDiagnostics: true,
    feedbackForm: true,
  },
  staging: {
    aiTutor: true,
    offlineMode: true,
    demoMode: true,
    detailedDiagnostics: true,
    feedbackForm: true,
  },
  production: {
    aiTutor: true,
    offlineMode: true,
    demoMode: false,
    detailedDiagnostics: true,
    feedbackForm: true,
  },
  test: {
    aiTutor: true,
    offlineMode: true,
    demoMode: false,
    detailedDiagnostics: false,
    feedbackForm: true,
  },
};

/**
 * Parses comma-separated flags from environment string.
 */
function parseEnvFlags(): Partial<Record<FeatureFlagKey, boolean>> {
  const raw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  if (!raw) return {};

  const result: Partial<Record<FeatureFlagKey, boolean>> = {};
  const flags = raw.split(',').map((f) => f.trim().toLowerCase());

  const validKeys: FeatureFlagKey[] = [
    'aiTutor',
    'offlineMode',
    'demoMode',
    'detailedDiagnostics',
    'feedbackForm',
  ];

  for (const key of validKeys) {
    if (flags.includes(key.toLowerCase())) {
      result[key] = true;
    } else if (flags.includes(`!${key.toLowerCase()}`)) {
      result[key] = false;
    }
  }

  return result;
}

/**
 * Returns complete resolved feature flags dictionary.
 */
export function getFeatureFlags(): FeatureFlagConfig {
  const currentEnv = env.appEnv;
  const defaults = DEFAULT_FLAGS[currentEnv] ?? {
    aiTutor: true,
    offlineMode: true,
    demoMode: false,
    detailedDiagnostics: true,
    feedbackForm: true,
  };
  const overrides = parseEnvFlags();

  return {
    aiTutor: overrides.aiTutor ?? defaults.aiTutor,
    offlineMode: overrides.offlineMode ?? defaults.offlineMode,
    demoMode: env.demoMode ? true : (overrides.demoMode ?? defaults.demoMode),
    detailedDiagnostics: overrides.detailedDiagnostics ?? defaults.detailedDiagnostics,
    feedbackForm: overrides.feedbackForm ?? defaults.feedbackForm,
  };
}

/**
 * Checks whether a specific feature flag is currently active.
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  const flags = getFeatureFlags();
  return flags[flag] ?? false;
}
