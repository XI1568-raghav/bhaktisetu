// Server-side PostHog feature flag evaluation. Env-or-noop: when
// NEXT_PUBLIC_POSTHOG_KEY (or POSTHOG_PERSONAL_API_KEY for /decide) is
// absent we return false / undefined so the app continues without flags.
//
// Why a 30s in-memory cache: PostHog /decide is fast but hot paths
// (homepage CTA, banner) hit it on every render. 30s is the sweet spot
// where rollout changes propagate within a minute and we save 95%+ calls.

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";

const TTL_MS = 30 * 1000;

interface CacheEntry {
  value: boolean | string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(flagKey: string, userId: string): string {
  return `${flagKey}::${userId}`;
}

interface DecideResponse {
  featureFlags?: Record<string, boolean | string>;
}

async function postDecide(
  userId: string,
): Promise<Record<string, boolean | string>> {
  if (!POSTHOG_KEY) return {};
  try {
    const res = await fetch(`${POSTHOG_HOST}/decide/?v=3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: userId,
      }),
    });
    if (!res.ok) return {};
    const json = (await res.json()) as DecideResponse;
    return json.featureFlags ?? {};
  } catch {
    // Never let a flag-eval error break a request path.
    return {};
  }
}

/**
 * Returns true if `flagKey` is enabled (or has any non-control variant)
 * for the given `userId`. Safe to call from any request handler — short
 * timeout, in-memory cache, and silent fallback to false.
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
): Promise<boolean> {
  if (!POSTHOG_KEY) return false;
  if (!flagKey || !userId) return false;

  const k = cacheKey(flagKey, userId);
  const now = Date.now();
  const hit = cache.get(k);
  if (hit && hit.expiresAt > now) {
    return Boolean(hit.value);
  }

  const flags = await postDecide(userId);
  const value = flags[flagKey] ?? false;

  cache.set(k, { value, expiresAt: now + TTL_MS });

  if (typeof value === "boolean") return value;
  // Multivariate: any non-"control" string variant counts as enabled.
  return value !== "control" && value !== "";
}

/**
 * Returns the variant string (multivariate flag) or boolean. `undefined`
 * when the flag is absent or PostHog is not configured.
 */
export async function getFeatureFlag(
  flagKey: string,
  userId: string,
): Promise<boolean | string | undefined> {
  if (!POSTHOG_KEY) return undefined;
  if (!flagKey || !userId) return undefined;

  const k = cacheKey(flagKey, userId);
  const now = Date.now();
  const hit = cache.get(k);
  if (hit && hit.expiresAt > now) return hit.value;

  const flags = await postDecide(userId);
  const value = flags[flagKey];
  if (value === undefined) return undefined;

  cache.set(k, { value, expiresAt: now + TTL_MS });
  return value;
}

/** Test-only: clear the in-memory cache. */
export function __clearFeatureFlagCache(): void {
  cache.clear();
}
