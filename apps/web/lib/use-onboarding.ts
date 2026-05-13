'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  ONBOARDING_EVENT,
  type OnboardingState,
  clearOnboarding,
  getOnboarding,
  isOnboardingFlagEnabled,
  setOnboarding,
} from './onboarding-store';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // Listen to both our app-level event and the cross-tab 'storage' event so
  // multiple components stay in sync (e.g. NavAuthButton menu vs the modal).
  window.addEventListener(ONBOARDING_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): OnboardingState | null {
  return getOnboarding();
}

function getServerSnapshot(): OnboardingState | null {
  return null;
}

export type UseOnboarding = {
  data: OnboardingState | null;
  set: (partial: Partial<OnboardingState>) => void;
  reset: () => void;
  isFirstRun: boolean;
  isFlagEnabled: boolean;
};

export function useOnboarding(): UseOnboarding {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback((partial: Partial<OnboardingState>) => {
    setOnboarding(partial);
  }, []);

  const reset = useCallback(() => {
    clearOnboarding();
  }, []);

  const isFirstRun = data === null || data.currentStep < 3;
  const isFlagEnabled = isOnboardingFlagEnabled();

  return { data, set, reset, isFirstRun, isFlagEnabled };
}
