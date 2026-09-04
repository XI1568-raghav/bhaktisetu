/**
 * TC-08 (P1, trust) — the pandit vetting claim, for the mobile binary.
 *
 * The product advertises Vedic credential verification, references from two
 * temples or senior pandits, a 30-day probationary video review and a
 * per-pandit trust score. Five tests pin that out of `apps/web`
 * (`pandit-vetting-claim.tc08.test.tsx`, `tc08-vedic-certified-badge.test.ts`,
 * `puja-temples-copy-honesty.tc08.test.tsx`,
 * `trust-copy-lane.tc01-tc13.test.tsx`, `tc01-jsonld-vetting-claim.test.ts`)
 * and every one of them walks `apps/web` only. `apps/mobile` was never in the
 * denominator and kept two live copies:
 *
 *   app/(devotee)/pujas.tsx      "N pujas · verified priests, video proof"
 *   app/(onboard)/become-priest.tsx
 *                                "Join 200+ verified pandits performing pujas"
 *
 * Why the adjective is false, in code rather than in policy:
 *
 *   - `apps/api` has no route that promotes a `Priest` to verified. The only
 *     production writer of `Priest.verificationStatus` is
 *     `apps/api/src/routes/priest.ts`, which writes `'pending'` with
 *     `status: 'inactive'`. `isVerified: true` / `verificationStatus:
 *     'approved'` are written in exactly two places, both seeds
 *     (`apps/api/prisma/seed.ts`, `apps/api/scripts/seed-demo-users.ts`).
 *   - `apps/api/src/routes/priests-public.ts` filters the public directory on
 *     `isVerified: true, status: 'active'`, so it can only ever list seeded
 *     rows.
 *   - `Priest.aadhaarVerified` has no writer outside those seeds, and the
 *     pandit-side `aadhaarVerified` is read as a PAYOUT gate, not published.
 *
 * `apps/mobile` cannot import from `apps/api`, so the flag is mirrored here
 * and `lib/__tests__/pandit-vetting.tc08.test.ts` re-reads
 * `apps/api/src/lib/pandit-vetting.ts` and fails if the two disagree. Flip
 * both in the same change the day the pipeline exists, and every sentence
 * returns unchanged. This is a GATE, not a deletion.
 */
export const HAS_PANDIT_VETTING = false;

/** The adjective a provider noun may carry — empty until a check exists. */
export const VERIFIED_ADJ = HAS_PANDIT_VETTING ? 'verified ' : '';

/** `verifiedNoun('priests')` → "verified priests" or "priests". */
export function verifiedNoun(noun: string): string {
  return `${VERIFIED_ADJ}${noun}`;
}

/**
 * The canonical honest wording, byte-identical to the clause
 * `apps/web/app/temples/[slug]/pujas/page.tsx` ships and
 * `apps/api/src/lib/pandit-vetting.ts` mirrors.
 */
export const PANDIT_VETTING_CLAUSE =
  'A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather ' +
  'than a public credential check';
