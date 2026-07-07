// EXPO_PUBLIC_API_URL is baked into every EAS profile (development / preview /
// production / testflight) via eas.json `env`. If a device build is missing it,
// fail loud at first call rather than 100% of requests silently hitting
// localhost:4000 — which is unreachable from physical devices and looks like a
// generic network error to users. __DEV__ allows the simulator/local Expo Go
// flow to keep using a localhost dev server when no env is configured.
declare const __DEV__: boolean;

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && env.trim().length > 0) return env;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'http://localhost:4000';
  }
  throw new Error(
    'mobile/lib/api: EXPO_PUBLIC_API_URL not set in this build. Configure it in eas.json `env` for every profile before building.'
  );
}

const API_ROOT = resolveApiBase();
const API_BASE = `${API_ROOT}/api/v1`;

/**
 * Shared API root (no trailing slash, no `/api/v1` suffix) for screens that
 * build their own auth-bearing fetch calls. Use this instead of re-reading
 * `process.env.EXPO_PUBLIC_API_URL` per-screen — that pattern silently fell
 * back to `localhost:4000` (unreachable from devices) in 6 screens. This
 * reuses the loud-failing resolver above, so a misconfigured build fails at
 * first call rather than silently hitting localhost.
 */
export function apiBase(): string {
  return API_ROOT;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
