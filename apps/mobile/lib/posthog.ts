/**
 * PostHog — env-or-noop wrapper (mobile).
 *
 * Active only when `EXPO_PUBLIC_POSTHOG_KEY` is set AND the
 * `posthog-react-native` package is installed. Loads the SDK lazily via
 * `require()` so the file is safe to import even before the dep is added —
 * `capture` / `identify` simply no-op until both env + package are present.
 *
 * To activate end-to-end:
 *   1. `pnpm add posthog-react-native --filter @poojly/mobile`
 *   2. Wrap the root in `<PostHogProvider client={posthog}>...</PostHogProvider>`
 *      (or call `init()` once at app start).
 *   3. Set EXPO_PUBLIC_POSTHOG_KEY in eas.json / .env.
 */

type PostHogLike = {
  capture: (name: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

let client: PostHogLike | null = null;
let initAttempted = false;

function tryInit(): PostHogLike | null {
  if (client || initAttempted) return client;
  initAttempted = true;

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

  try {
    // Avoid static import — package may not be installed yet. When it isn't,
    // require throws and we fall through to the noop path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('posthog-react-native') as {
      PostHog: new (apiKey: string, opts: { host?: string }) => PostHogLike;
    };
    client = new mod.PostHog(key, { host });
    return client;
  } catch {
    return null;
  }
}

export function capture(name: string, props?: Record<string, unknown>): void {
  const c = tryInit();
  if (!c) return;
  try {
    c.capture(name, props);
  } catch {
    // Silent — analytics should never break the app.
  }
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  const c = tryInit();
  if (!c) return;
  try {
    c.identify(userId, props);
  } catch {}
}

export function reset(): void {
  const c = tryInit();
  if (!c) return;
  try {
    c.reset();
  } catch {}
}
