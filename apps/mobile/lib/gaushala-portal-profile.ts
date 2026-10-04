/**
 * PAR-24. The gaushala manager's OWN profile.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `(gaushala)/profile.tsx` called `useGaushalas()` from @poojly/api-client,
 * which is `GET /api/v1/gaushala` — the SAMPLE listing feed. Its own service
 * header reads "Gaushala Data — SAMPLE listings. Nothing here has been
 * verified." (apps/api/src/services/gaushala.service.ts:70). The screen then
 * tried to find "me" in that feed by `g.name === user.fullName`, so:
 *
 *   • For every real manager the match fails and the query is dead weight —
 *     the screen renders the auth user's name and nothing else, having made a
 *     network call for a list of five fixtures.
 *   • For a manager whose account name happens to equal a fixture name (org
 *     accounts are named exactly like this) it MATCHES, and the screen then
 *     prints that fixture's unverified description — "Founded in 1993 by Shri
 *     Magaram Chaudhary", cow counts, facility lists — as this gaushala's own
 *     About text.
 *   • `cowCount` is not even a key the feed sends (it sends `totalCows`), so
 *     the "N cows in care" line could never render regardless.
 *
 * The real, role-gated source is `GET /api/v1/gaushala-portal/dashboard`
 * (apps/api/src/routes/gaushala-portal.ts:55), which returns
 * `{profile, stats, recentDonations, recentCows}` where `profile` is this
 * user's own GaushalaProfile row — `gaushalaName`, `address`, `city`,
 * `totalCows`, `description`, `approved` — or `null` when they have not created
 * one. `/api/v1/providers/gaushala` (`where: {approved: true}`) is the other
 * real source, but it is the public directory of ALL approved gaushalas, not
 * "mine", so it is the wrong one for this screen.
 *
 * NOT exposed here, deliberately: `GaushalaProfile.verified`. TC-11 established
 * that nothing in the API ever writes that column — every approval path writes
 * `approved` — so rendering it would be a verification badge with no verifier.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@poojly/api-client';

export const gaushalaPortalQueryKeys = {
  dashboard: ['gaushala-portal', 'dashboard'] as const,
};

export function useGaushalaPortalDashboard(
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown>({
    queryKey: gaushalaPortalQueryKeys.dashboard,
    queryFn: () => api.get<unknown>('/api/v1/gaushala-portal/dashboard'),
    ...options,
  });
}

export interface GaushalaSelfProfileVM {
  /** `null` when the manager has not created a profile yet. */
  name: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  /** Kept in sync by gaushala-cows.ts syncCowCount(). `null` if absent. */
  totalCows: number | null;
  /** A reviewer approved the listing. NOT a statutory verification. */
  approved: boolean;
  /** True when the server said `profile: null` — no profile created yet. */
  profileMissing: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/**
 * `null` means the dashboard body was not recognised (403 / error envelope) —
 * distinct from `profileMissing`, which is the server explicitly saying the
 * manager has no profile row yet.
 */
export function selectGaushalaSelfProfile(payload: unknown): GaushalaSelfProfileVM | null {
  if (!isRecord(payload) || !('profile' in payload)) return null;
  const profile = payload.profile;
  if (!isRecord(profile)) {
    return {
      name: null,
      city: null,
      address: null,
      description: null,
      totalCows: null,
      approved: false,
      profileMissing: true,
    };
  }
  return {
    name: str(profile.gaushalaName),
    city: str(profile.city),
    address: str(profile.address),
    description: str(profile.description),
    totalCows:
      typeof profile.totalCows === 'number' && Number.isFinite(profile.totalCows)
        ? profile.totalCows
        : null,
    approved: profile.approved === true,
    profileMissing: false,
  };
}
