/**
 * TC-08 (P1, trust) — the published pandit vetting process, for the API.
 *
 * The product advertises Vedic credential verification, references from two
 * temples or senior pandits, a 30-day probationary video review and a
 * per-pandit trust score. Earlier waves removed all of that from `apps/web`
 * and pinned it with five tests
 * (`pandit-vetting-claim.tc08.test.tsx`, `tc08-vedic-certified-badge.test.ts`,
 * `puja-temples-copy-honesty.tc08.test.tsx`, `trust-copy-lane.tc01-tc13.test.tsx`,
 * `tc01-jsonld-vetting-claim.test.ts`). Every one of those walks `apps/web`
 * only, so `apps/api` and `apps/mobile` kept publishing it.
 *
 * Measured on production on 2026-09-01, before this file existed:
 *
 *   $ curl -s -X POST https://api.darshya.online/api/v1/support/chat \
 *       -H 'Content-Type: application/json' \
 *       -d '{"message":"how do I become pandit"}'
 *   {"message":"We onboard verified priests and astrologers. Share your
 *    credentials at /priest-onboarding — typical verification takes 3–5 days
 *    (ID, training, test readings).", ...}
 *
 *   $ ... -d '{"message":"what is poojly"}'
 *   {"message":"Darshya is India's devotional super-app — ... All
 *    Aadhaar-verified priests, all secure payments.", ...}
 *
 * Why both are false, in code rather than in policy:
 *
 *   - There is no ID check, no training and no test reading anywhere in this
 *     repository, and no 3–5 day SLA that anything measures or can breach.
 *   - Nothing promotes a `Priest` to verified. The ONLY production writer of
 *     `Priest.verificationStatus` is `routes/priest.ts`, and it writes
 *     `'pending'` with `status: 'inactive'`. `isVerified: true` /
 *     `verificationStatus: 'approved'` are written in exactly two places, both
 *     seeds: `prisma/seed.ts` and `scripts/seed-demo-users.ts`. Since
 *     `routes/priests-public.ts` and `services/dispatch.service.ts` both filter
 *     on exactly those columns, the public pandit directory and the dispatch
 *     pool can contain seeded rows and nothing else.
 *   - What DOES exist is a single admin toggle on a different model:
 *     `services/onboarding.service.ts` `approveProviderProfile()` sets
 *     `PanditProfile.approved`. One boolean flipped by a human is not
 *     credential verification, two temple references, a probation review or a
 *     turnaround commitment, and it does not touch `Priest.isVerified`.
 *   - `Priest.aadhaarVerified` has no writer outside those same two seeds, and
 *     `PanditProfile.aadhaarVerified` is read as a PAYOUT gate
 *     (`routes/providers.ts`), not as a published credential. "All
 *     Aadhaar-verified priests" is therefore a claim about seed data.
 *
 * The one step that genuinely runs is the payout gate, so it is the only step
 * the copy may name — and {@link PANDIT_VETTING_CLAUSE} is the same sentence
 * `apps/web` already ships, so the API and the website cannot give a devotee
 * two different accounts of the same fact.
 *
 * This is a GATE, not a deletion. Build the pipeline, set
 * {@link HAS_PANDIT_VETTING} to true, and every sentence returns unchanged.
 */

/**
 * True only once an independent credential check, a reference workflow and a
 * probation review actually run and can promote a Priest row.
 */
export const HAS_PANDIT_VETTING = false;

/**
 * The canonical honest wording, byte-identical to the clause pinned in
 * `apps/web/app/temples/[slug]/pujas/page.tsx` by
 * `apps/web/__tests__/pandit-vetting-claim.tc08.test.tsx`.
 */
export const PANDIT_VETTING_CLAUSE =
  'A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather ' +
  'than a public credential check';

/**
 * The adjective a provider noun may carry. Empty until a vetting step exists,
 * so "verified priests" becomes "priests" rather than becoming a softer lie.
 */
export const VERIFIED_ADJ = HAS_PANDIT_VETTING ? 'verified ' : '';

/** `verifiedNoun('priests')` → "verified priests" or "priests". */
export function verifiedNoun(noun: string): string {
  return `${VERIFIED_ADJ}${noun}`;
}

/**
 * What the support bot may tell someone asking how to join. The false version
 * promised "typical verification takes 3–5 days (ID, training, test
 * readings)"; nothing in the repository performs any of the three.
 */
export const PANDIT_ONBOARDING_ANSWER = HAS_PANDIT_VETTING
  ? 'We onboard verified priests and astrologers. Share your credentials at /priest-onboarding — ' +
    'typical verification takes 3–5 days (ID, training, test readings).'
  : 'You can register at /priest-onboarding. Honestly, so you can plan: we do not yet run an ' +
    'independent credential check, temple reference calls or a probation review, and we cannot ' +
    'quote a turnaround — a new profile stays pending until a person reviews it by hand. What is ' +
    'in place is Aadhaar-based KYC before any payout, and mandatory video proof of every puja.';

/**
 * What the support bot may say about the platform as a whole. The false
 * version ended "All Aadhaar-verified priests, all secure payments."
 */
export const PLATFORM_SUMMARY_TRUST_CLAUSE = HAS_PANDIT_VETTING
  ? 'All Aadhaar-verified priests, all secure payments.'
  : 'Every puja carries mandatory video proof, and a pandit is paid only once Aadhaar-based KYC ' +
    'is on file — a payout gate rather than a public credential check.';
