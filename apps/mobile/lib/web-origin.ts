/**
 * Which darshya WEB site this build belongs to.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every API call in the app goes through `apiBase()` (lib/api.ts), which reads
 * EXPO_PUBLIC_API_URL — that is how a development build talks to a LAN server
 * and how a preview build would talk to a staging API. The hand-offs to the
 * website did not: they were literal `https://darshya.online/...` strings
 * scattered across screens. In the payment hand-off that is a real defect and
 * not a cosmetic one: a non-production build creates a real booking on ITS
 * server and then opens PRODUCTION to pay for an id that does not exist there,
 * after the booking has already taken a slot hold.
 *
 * WHAT IT RESOLVES, IN ORDER
 * --------------------------
 *   1. EXPO_PUBLIC_WEB_URL — an operator saying so explicitly always wins.
 *   2. EXPO_PUBLIC_API_URL with its leading `api.` label removed. That is
 *      exactly how the two hosts relate in every EAS profile
 *      (api.darshya.online → darshya.online), so the derivation is a fact
 *      about this deployment, not a guess.
 *   3. production — and `matchesEnvironment` is FALSE, which is the whole
 *      point of returning a pair rather than a string. A caller that cannot
 *      tell a derived origin from a fallback cannot warn about it, and a
 *      silent cross-environment hand-off in a money path is what this module
 *      exists to stop.
 *
 * Pure and dependency-free — no import of lib/api.ts, whose module
 * initialisation THROWS when EXPO_PUBLIC_API_URL is unset outside __DEV__.
 */

/** Where the app points when nothing else can be established. */
export const PRODUCTION_WEB_ORIGIN = 'https://darshya.online';

export interface WebOriginResolution {
  /** Scheme + host (+ port). Never has a trailing slash. */
  origin: string;
  /**
   * true when this origin was stated by the build or derived from its API
   * host. false means it is the production fallback and the API points
   * somewhere else — the caller must say so rather than hand the devotee over.
   */
  matchesEnvironment: boolean;
}

const ORIGIN_RE = /^(https?):\/\/([^/?#\s]+)/i;

function trimOrigin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveWebOrigin(
  apiUrl?: string | null,
  explicitWebUrl?: string | null,
): WebOriginResolution {
  const explicit = trimOrigin(explicitWebUrl);
  if (explicit) return { origin: explicit, matchesEnvironment: true };

  const api = trimOrigin(apiUrl);
  const m = api ? ORIGIN_RE.exec(api) : null;
  if (m) {
    const scheme = m[1]!.toLowerCase();
    const authority = m[2]!;
    // Split a numeric port off the authority so `api.localhost:4000` keeps its
    // port. A colon that is not followed by digits is not a port.
    const colon = authority.lastIndexOf(':');
    const hasPort = colon > -1 && /^\d+$/.test(authority.slice(colon + 1));
    const host = hasPort ? authority.slice(0, colon) : authority;
    const port = hasPort ? authority.slice(colon) : '';
    if (/^api\./i.test(host)) {
      return { origin: `${scheme}://${host.slice(4)}${port}`, matchesEnvironment: true };
    }
  }

  return { origin: PRODUCTION_WEB_ORIGIN, matchesEnvironment: false };
}

/** The resolution for THIS build. Reads env lazily; never throws. */
export function webOrigin(): WebOriginResolution {
  return resolveWebOrigin(process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_WEB_URL);
}

/**
 * The host to name in a label. A button that says "Pay on darshya.online"
 * while opening something else is the same lie the URL used to tell, moved
 * into the copy.
 */
export function hostOf(origin: string): string {
  return ORIGIN_RE.exec(origin)?.[2] ?? origin;
}
