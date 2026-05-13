'use client';

import { useEffect, useState, type ReactNode } from 'react';

// Mirrors the public contract of apps/web/lib/use-onboarding (which ships in a
// parallel PR). Kept narrow so this file does not import from a module that
// may not yet exist at build time.
export type PrimaryIntent =
  | 'darshan'
  | 'puja'
  | 'wisdom'
  | 'consult'
  | 'explore'
  | null
  | undefined;

export type OnboardingData = {
  primaryIntent?: PrimaryIntent;
  // Other fields (lang, isNri, etc.) intentionally untyped — they belong to
  // the real hook and we never read them here.
  [key: string]: unknown;
} | null;

export type OnboardingApi = {
  data: OnboardingData;
  clearIntent?: () => void;
  setPrimaryIntent?: (intent: PrimaryIntent) => void;
};

// We adapt to two possible real-hook shapes:
//   1. The current shape in apps/web/lib/use-onboarding.ts:
//        { data, set(partial), reset(), isFirstRun, isFlagEnabled }
//   2. A future shape that exposes explicit clearIntent / setPrimaryIntent.
// Both are mapped to a single OnboardingApi the components consume.
type RealHookResult = {
  data?: OnboardingData;
  // Future-style helpers
  clearIntent?: () => void;
  setPrimaryIntent?: (intent: PrimaryIntent) => void;
  // Current-style helpers
  set?: (partial: { primaryIntent?: PrimaryIntent } & Record<string, unknown>) => void;
  reset?: () => void;
};

type RealHook = () => RealHookResult;

let cachedHook: RealHook | null | undefined; // undefined = unattempted, null = unavailable

async function loadHook(): Promise<RealHook | null> {
  if (cachedHook !== undefined) return cachedHook;
  try {
    const mod = (await import('../../lib/use-onboarding')) as unknown;
    const candidate =
      (mod as { useOnboarding?: unknown; default?: unknown }).useOnboarding ??
      (mod as { default?: unknown }).default;
    cachedHook = typeof candidate === 'function' ? (candidate as RealHook) : null;
  } catch {
    cachedHook = null;
  }
  return cachedHook;
}

// Renders `children(api)` only after the real onboarding hook has been
// resolved. While loading or when the module is absent, renders the fallback
// (defaults to `null`). This pattern keeps Rules of Hooks intact: the hook is
// only ever called inside `<HookCaller>`, which is mounted exactly once the
// hook function is known to exist.
export function OnboardingGate({
  children,
  fallback = null,
}: {
  children: (api: OnboardingApi) => ReactNode;
  fallback?: ReactNode;
}) {
  // useState's lazy initializer would invoke `cachedHook` (because it's a
  // function); wrap with a function-returning thunk so React stores the hook
  // reference itself, not its return value.
  const [hook, setHook] = useState<RealHook | null>(() =>
    typeof cachedHook === 'function' ? cachedHook : null,
  );
  const [resolved, setResolved] = useState<boolean>(cachedHook !== undefined);

  useEffect(() => {
    if (cachedHook !== undefined) {
      // setHook with a functional updater would invoke the function. Wrap.
      setHook(() => (typeof cachedHook === 'function' ? cachedHook : null));
      setResolved(true);
      return;
    }
    let cancelled = false;
    loadHook().then((fn) => {
      if (cancelled) return;
      setHook(() => fn);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!resolved) return <>{fallback}</>;
  if (!hook) return <>{fallback}</>;
  return <HookCaller hook={hook}>{children}</HookCaller>;
}

function HookCaller({
  hook,
  children,
}: {
  hook: RealHook;
  children: (api: OnboardingApi) => ReactNode;
}) {
  // Safe: the parent only mounts this component after `hook` is a stable
  // function for the lifetime of the gate. React's hook-call ordering is
  // therefore preserved across renders of HookCaller.
  let api: OnboardingApi;
  try {
    const result = hook();
    const data = (result?.data ?? null) as OnboardingData;

    // Prefer explicit helpers; fall back to the `set(partial)` / `reset()`
    // shape used by the current real hook so dismiss works without the real
    // hook ever needing to grow new methods.
    const setPrimaryIntent: OnboardingApi['setPrimaryIntent'] =
      result?.setPrimaryIntent ??
      (result?.set
        ? (intent: PrimaryIntent) => result.set?.({ primaryIntent: intent })
        : undefined);

    const clearIntent: OnboardingApi['clearIntent'] =
      result?.clearIntent ??
      (result?.set
        ? () => result.set?.({ primaryIntent: null })
        : undefined);

    api = { data, clearIntent, setPrimaryIntent };
  } catch {
    api = { data: null };
  }
  return <>{children(api)}</>;
}
