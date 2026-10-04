/**
 * The signed-in provider's OWN profile, off their own portal dashboard.
 *
 * WHAT THIS REPLACES: IDENTITY BY NAME MATCH
 * ------------------------------------------
 * `app/(astrologer)/profile.tsx` and `app/(wellness)/profile.tsx` both worked
 * out who the signed-in provider was by searching a PUBLIC directory for a row
 * whose display name equalled their own:
 *
 *   const me = instructorsQuery.data?.instructors?.find(
 *     (i) => i.name === user?.fullName,
 *   );
 *
 *   const me = astrologersQuery.data?.astrologers?.find(
 *     (a) => a.name === user?.fullName || (user?.email && a.email === user.email),
 *   );
 *
 * Three ways that is wrong, all of them silent:
 *
 *  1. The public directories list APPROVED providers only. A provider awaiting
 *     approval — exactly the person most likely to be checking their profile —
 *     matches nothing, so the screen showed "No specializations on file" about
 *     a profile that had them, and no bio, and no rate.
 *  2. Two providers who share a common name resolve to whichever row the
 *     directory returned first. On a devotional platform in India, sharing a
 *     name is not an edge case. The screen would then show one person their
 *     colleague's bio, rating and per-minute rate.
 *  3. `email` is not a field the astrologer directory returns — the cast
 *     `(a as { email?: string }).email` was reading a key that does not exist,
 *     so that half of the condition never fired.
 *
 * `GET /astrologer-portal/dashboard` and `GET /wellness-portal/dashboard` each
 * return the caller's own row as `profile`, resolved server-side from the
 * bearer token via `AstrologerProfile.userId` / `WellnessProfile.userId`. There
 * is nothing to match on, and no way to see somebody else's.
 *
 * Column names are the schema's, not the directory's: the profile tables store
 * `specialties`, while the public directory renames it `specializations`. That
 * rename is why the old screens' `me?.specializations` would have read
 * `undefined` even if the match had worked.
 */

export interface ProviderOwnProfileVM {
  displayName: string | null;
  bio: string | null;
  /** `AstrologerProfile.specialties` / `WellnessProfile.specialties`. */
  specialties: string[];
  /** Astrologer only; `[]` for wellness, which has no languages column. */
  languages: string[];
  /** `WellnessProfile.certifications`. `[]` for astrologers. */
  certifications: string[];
  experienceYears: number | null;
  /** `0` in the column means "not rated yet", so it surfaces as `null`. */
  rating: number | null;
  /** Astrologer: pricePerMinute. Wellness: pricePerSession. Rupees. */
  priceInr: number | null;
  approved: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Only real, non-empty strings survive — never a placeholder. */
function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/**
 * `null` when the payload carries no `profile` — which is what both dashboards
 * send when the provider has not completed onboarding, and also what a 500
 * body looks like. The screens say "not set up yet" rather than rendering an
 * empty shell that reads as "you have nothing on file".
 *
 * `priceField` names the money column, because the two roles bill differently:
 * an astrologer per minute, an instructor per session. Both are `Decimal(10,2)`
 * and Prisma serialises them as STRINGS over JSON, so they are coerced here
 * rather than being handed to `toLocaleString` as-is.
 */
export function selectProviderOwnProfile(
  payload: unknown,
  priceField: 'pricePerMinute' | 'pricePerSession',
): ProviderOwnProfileVM | null {
  if (!isRecord(payload)) return null;
  const profile = isRecord(payload.profile) ? payload.profile : null;
  if (!profile) return null;
  const rating = num(profile.rating);
  return {
    displayName: str(profile.displayName),
    bio: str(profile.bio),
    specialties: strArray(profile.specialties),
    languages: strArray(profile.languages),
    certifications: strArray(profile.certifications),
    experienceYears: num(profile.experience),
    rating: rating !== null && rating > 0 ? rating : null,
    priceInr: num(profile[priceField]),
    approved: profile.approved === true,
  };
}
