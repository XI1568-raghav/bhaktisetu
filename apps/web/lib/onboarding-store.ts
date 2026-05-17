/**
 * Onboarding store — first-run guided experience state.
 *
 * Storage key MUST remain 'poojly_onboarding_v1' for back-compat with the
 * legacy `poojly_*` namespace (folder is named bhaktisetu, but storage keys
 * predate the rename). Never bump the key without a migration.
 *
 * SSR-safe: every accessor short-circuits when `window` is undefined.
 * Resilient: malformed JSON is swept and treated as "no state".
 */

export type OnboardingIntent =
  | 'darshan'
  | 'puja'
  | 'wisdom'
  | 'consult'
  | 'explore';

export type OnboardingLang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export type OnboardingState = {
  primaryIntent: OnboardingIntent | null;
  lang: OnboardingLang | null;
  isNri: boolean | null;
  completedAt: string | null;
  currentStep: 0 | 1 | 2 | 3;
  version: 1;
};

export const ONBOARDING_STORAGE_KEY = 'poojly_onboarding_v1';
export const ONBOARDING_LANGUAGE_KEY = 'poojly_language';
export const ONBOARDING_EVENT = 'darshya:onboarding-changed';

const DEFAULT_STATE: OnboardingState = {
  primaryIntent: null,
  lang: null,
  isNri: null,
  completedAt: null,
  currentStep: 0,
  version: 1,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isValidIntent(v: unknown): v is OnboardingIntent | null {
  return (
    v === null ||
    v === 'darshan' ||
    v === 'puja' ||
    v === 'wisdom' ||
    v === 'consult' ||
    v === 'explore'
  );
}

function isValidLang(v: unknown): v is OnboardingLang | null {
  return (
    v === null ||
    v === 'en' ||
    v === 'hi' ||
    v === 'ta' ||
    v === 'te' ||
    v === 'bn' ||
    v === 'mr'
  );
}

function isValidStep(v: unknown): v is 0 | 1 | 2 | 3 {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

function normalize(raw: unknown): OnboardingState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<OnboardingState>;
  if (!isValidIntent(r.primaryIntent ?? null)) return null;
  if (!isValidLang(r.lang ?? null)) return null;
  if (r.isNri !== null && r.isNri !== undefined && typeof r.isNri !== 'boolean') return null;
  if (r.completedAt !== null && r.completedAt !== undefined && typeof r.completedAt !== 'string') return null;
  if (r.currentStep === undefined || !isValidStep(r.currentStep)) return null;
  if (r.version !== 1) return null;
  return {
    primaryIntent: (r.primaryIntent ?? null) as OnboardingIntent | null,
    lang: (r.lang ?? null) as OnboardingLang | null,
    isNri: r.isNri === null || r.isNri === undefined ? null : r.isNri,
    completedAt: r.completedAt ?? null,
    currentStep: r.currentStep,
    version: 1,
  };
}

// Snapshot cache — useSyncExternalStore requires getSnapshot() return a
// stable reference when underlying data hasn't changed. Without this cache,
// every render re-parses JSON and produces a new object, which React 18
// detects as "getSnapshot should be cached" → infinite render loop →
// SentryErrorBoundary fallback ("Something went wrong. Please refresh.").
let cachedRaw: string | null = null;
let cachedSnapshot: OnboardingState | null = null;

export function getOnboarding(): OnboardingState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    if (!raw) {
      cachedRaw = null;
      cachedSnapshot = null;
      return null;
    }
    const parsed = JSON.parse(raw);
    const normalized = normalize(parsed);
    if (!normalized) {
      // Bad data — sweep so subsequent reads don't keep failing.
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      cachedRaw = null;
      cachedSnapshot = null;
      return null;
    }
    cachedRaw = raw;
    cachedSnapshot = normalized;
    return normalized;
  } catch {
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* noop */
    }
    cachedRaw = null;
    cachedSnapshot = null;
    return null;
  }
}

export function setOnboarding(partial: Partial<OnboardingState>): void {
  if (!isBrowser()) return;
  const current = getOnboarding() ?? DEFAULT_STATE;
  const next: OnboardingState = {
    ...current,
    ...partial,
    version: 1,
  };
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
  } catch {
    /* quota or serialization failure — silent, env-or-noop */
  }
}

export function clearOnboarding(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
  } catch {
    /* noop */
  }
}

/**
 * Feature flag for the v1 onboarding modal.
 *
 * DEFAULT: disabled. Returns true ONLY when
 * `process.env.NEXT_PUBLIC_ONBOARDING_V1 === '1'`.
 *
 * This is intentionally conservative — onboarding ships dark and the main
 * thread will flip the flag when integration into layout.tsx is ready.
 */
export function isOnboardingFlagEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_V1 === '1';
}
