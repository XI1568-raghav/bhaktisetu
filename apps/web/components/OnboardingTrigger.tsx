'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useOnboarding } from '../lib/use-onboarding';

const OnboardingModal = dynamic(() => import('./OnboardingModal'), {
  ssr: false,
});

const OPEN_EVENT = 'darshya:open-onboarding';
const FIRST_RUN_DELAY_MS = 1500;

export default function OnboardingTrigger() {
  const { isFirstRun, isFlagEnabled } = useOnboarding();
  const [open, setOpen] = useState(false);

  // Auto-open on first run, slightly delayed so it doesn't fight with LCP.
  useEffect(() => {
    if (!isFlagEnabled) return;
    if (!isFirstRun) return;
    const handle = setTimeout(() => setOpen(true), FIRST_RUN_DELAY_MS);
    return () => clearTimeout(handle);
  }, [isFlagEnabled, isFirstRun]);

  // Manual re-open hook (e.g. NavAuthButton menu, mobile drawer).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, onOpen as EventListener);
  }, []);

  if (!isFlagEnabled && !open) return null;
  if (!open) return null;

  return <OnboardingModal open={open} onClose={() => setOpen(false)} />;
}
