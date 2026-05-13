import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  clearOnboarding,
  getOnboarding,
  isOnboardingFlagEnabled,
  setOnboarding,
} from '../lib/onboarding-store';

describe('onboarding-store', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns null when no state has been written', () => {
    expect(getOnboarding()).toBeNull();
  });

  it('persists a partial set + reads it back, preserving defaults for unset fields', () => {
    setOnboarding({ primaryIntent: 'darshan', currentStep: 1 });
    const got = getOnboarding();
    expect(got).not.toBeNull();
    expect(got?.primaryIntent).toBe('darshan');
    expect(got?.currentStep).toBe(1);
    expect(got?.lang).toBeNull();
    expect(got?.isNri).toBeNull();
    expect(got?.completedAt).toBeNull();
    expect(got?.version).toBe(1);
  });

  it('merges partial updates rather than replacing state', () => {
    setOnboarding({ primaryIntent: 'puja', currentStep: 1 });
    setOnboarding({ lang: 'hi', currentStep: 2 });
    const got = getOnboarding();
    expect(got?.primaryIntent).toBe('puja');
    expect(got?.lang).toBe('hi');
    expect(got?.currentStep).toBe(2);
  });

  it('clearOnboarding wipes the key', () => {
    setOnboarding({ primaryIntent: 'darshan', currentStep: 1 });
    clearOnboarding();
    expect(getOnboarding()).toBeNull();
  });

  it('returns null and sweeps storage when the persisted JSON is corrupt', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '{not json');
    expect(getOnboarding()).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('returns null and sweeps storage when the version is wrong', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        primaryIntent: 'darshan',
        lang: 'en',
        isNri: false,
        completedAt: null,
        currentStep: 1,
        version: 99,
      }),
    );
    expect(getOnboarding()).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('returns null and sweeps storage when fields fail validation', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        primaryIntent: 'not-a-real-intent',
        lang: 'en',
        isNri: false,
        completedAt: null,
        currentStep: 1,
        version: 1,
      }),
    );
    expect(getOnboarding()).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('isOnboardingFlagEnabled defaults to false', () => {
    delete process.env.NEXT_PUBLIC_ONBOARDING_V1;
    expect(isOnboardingFlagEnabled()).toBe(false);
  });

  it('isOnboardingFlagEnabled is true only when env equals "1"', () => {
    process.env.NEXT_PUBLIC_ONBOARDING_V1 = '1';
    expect(isOnboardingFlagEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_ONBOARDING_V1 = 'true';
    expect(isOnboardingFlagEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_ONBOARDING_V1 = '';
    expect(isOnboardingFlagEnabled()).toBe(false);
  });

  // SSR-safe simulation: monkey-patch globals for the duration of the test.
  it('returns null on the server (no window/localStorage)', async () => {
    const realWindow = globalThis.window;
    // @ts-expect-error — emulating SSR by removing window
    delete globalThis.window;
    try {
      // re-import to re-evaluate isBrowser without window — but our impl reads
      // window dynamically per-call, so a fresh import is not required.
      expect(getOnboarding()).toBeNull();
    } finally {
      globalThis.window = realWindow;
    }
  });
});
