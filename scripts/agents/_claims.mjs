// Honesty gate for the outbound-content agent fleet.
//
// TC-01 (P0) — the Section 80G deduction promise.
// TC-08 (P1) — the published pandit vetting process.
//
// Both findings were closed three times over and both survived here, because
// every guard written for them walks exactly one app:
//
//   apps/web/__tests__/tc01-80g-repo-wide-gate.test.tsx   apps/web,  .ts/.tsx/.json
//   apps/api/src/lib/api-80g-repo-wide-gate.tc01.test.ts  apps/api
//   apps/mobile/lib/__tests__/eighty-g-*.test.ts          apps/mobile
//   apps/web/__tests__/pandit-vetting-claim.tc08.test.tsx apps/web
//   apps/mobile/lib/__tests__/pandit-vetting.tc08.test.ts apps/mobile
//   apps/api/src/lib/pandit-vetting.tc08.test.ts          apps/api
//
// `scripts/agents/` is in none of those denominators, and it is not source that
// merely describes the product — it is the fleet that WRITES THE PRODUCT'S
// OUTBOUND COPY on a GitHub Actions cron: the 7-touch onboarding drip, the
// dormant-user reactivation mail, the daily social queue, the blog drafts, the
// YouTube descriptions, the UK institutional outreach. The founder copies that
// output and publishes it. Twelve of those generators asserted an 80G receipt,
// a "verified pandit", or both.
//
// Why both claims are false, in code rather than in policy:
//
//   80G  — `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is
//          `false` with `pan` and `eightyGNumber` both `null`;
//          `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires BOTH a
//          donee 80G registration number AND a donee PAN, read from
//          `gaushala_profiles.regn_80g` / `.pan`, which are SELECTed in exactly
//          one place (`apps/api/src/routes/donations.ts`) and written by no
//          route in the repository. So `is80GEligible()` is false for every
//          donation ever made, and no donee can qualify.
//
//   vetting — nothing promotes a `Priest` to verified. The only production
//          writer of `Priest.verificationStatus` is `apps/api/src/routes/priest.ts`,
//          which writes `'pending'`; `isVerified: true` appears only in
//          `apps/api/prisma/seed.ts` and `apps/api/scripts/seed-demo-users.ts`.
//          There is no credential upload, no reference workflow, no probation
//          review and no per-pandit trust score column.
//
// The flags below are READ from those two files rather than mirrored, because a
// mirrored copy is precisely how this claim reached a fifth live app. Flip
// `HAS_80G_VERIFIED` in apps/web/lib/company.ts (or `HAS_PANDIT_VETTING` in
// apps/api/src/lib/pandit-vetting.ts) and every sentence below returns
// unchanged. This is a GATE, not a deletion.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '../..');

function readFlag(relPath, name) {
  const src = readFileSync(resolve(REPO_ROOT, relPath), 'utf8');
  const m = new RegExp(`${name}\\s*[:=]\\s*(true|false)`).exec(src);
  if (!m) {
    throw new Error(
      `${name} not found in ${relPath} — refusing to publish outbound copy whose trust ` +
        'claims cannot be checked against the owner flag.',
    );
  }
  return m[1] === 'true';
}

/** Mirrors nothing: read live from apps/web/lib/company.ts. */
export const HAS_80G = readFlag('apps/web/lib/company.ts', 'HAS_80G_VERIFIED');

/** Read live from apps/api/src/lib/pandit-vetting.ts. */
export const HAS_PANDIT_VETTING = readFlag(
  'apps/api/src/lib/pandit-vetting.ts',
  'HAS_PANDIT_VETTING',
);

// ---------------------------------------------------------------- the strings
//
// Built by a pure factory rather than by top-level ternaries so that
// `outbound-claims.tc01-tc08.test.mjs` can assert BOTH states — that the claim
// is absent while the flags are false, and that it returns unchanged when they
// flip. A gate that cannot be shown to restore the copy is indistinguishable
// from a deletion, and this engagement has been burned by that distinction.

/**
 * @param {{ has80G: boolean, hasPanditVetting: boolean }} flags
 */
export function claimStrings({ has80G, hasPanditVetting }) {
  /** The one-sentence disclosure a donor is entitled to while the registration
   * is missing. Byte-identical to `apps/api/src/lib/eighty-g.ts`
   * NO_80G_DISCLOSURE and `apps/web/lib/eighty-g.ts`, so an email, the website
   * and the receipt PDF cannot give three accounts of the same fact. */
  const NO_80G_DISCLOSURE =
    'Every donation gets a numbered receipt PDF by email. It is proof of payment, ' +
    'not a tax-exemption certificate: Darshya holds no Section 80G registration ' +
    'yet, so nothing donated today can be claimed as an 80G deduction.';

  /** The adjective a provider noun may carry. Empty until a vetting step
   * exists, so "verified pandits" becomes "pandits" rather than a softer lie.
   * Same semantics as `apps/api/src/lib/pandit-vetting.ts` VERIFIED_ADJ. */
  const VERIFIED_ADJ = hasPanditVetting ? 'verified ' : '';

  return {
    // ------------------------------------------------------------ 80G (TC-01)
    /** "80G receipt" once registered, "donation receipt" until then. */
    RECEIPT_NOUN: has80G ? '80G receipt' : 'donation receipt',
    /** Title-case form for subject lines and headings. */
    RECEIPT_NOUN_TITLE: has80G ? '80G Receipt' : 'Donation Receipt',
    /** The short form a tweet or caption can carry: social copy has a character
     * budget, so the long disclosure does not fit, but this still refuses to
     * imply a deduction. */
    RECEIPT_SHORT: has80G
      ? '80G receipt'
      : 'numbered receipt (proof of payment, not a tax certificate)',
    NO_80G_DISCLOSURE,
    /** The line an email body may use where it promised a deduction. */
    DONATION_RECEIPT_LINE: has80G
      ? '80G certificate issued within 24 hours.'
      : NO_80G_DISCLOSURE,
    /** The phrase only when the registration exists, otherwise `fallback`. */
    withEightyG: (phrase, fallback = '') => (has80G ? phrase : fallback),

    // -------------------------------------------------- pandit vetting (TC-08)
    VERIFIED_ADJ,
    /** `verifiedNoun('pandits')` -> "verified pandits" or "pandits". */
    verifiedNoun: (noun) => `${VERIFIED_ADJ}${noun}`,
    /** What may honestly be said about pandit trust. The two steps named in the
     * false-flag branch are the two that actually run:
     * `apps/api/src/routes/providers.ts` reads `aadhaarVerified` as a payout
     * gate, and video proof is enforced on every booking. */
    PANDIT_TRUST_LINE: hasPanditVetting
      ? 'Every pandit passes Vedic credential verification, two temple references and a 30-day probation review.'
      : 'Every puja carries mandatory video proof, and a pandit is paid only once Aadhaar-based KYC is on file — a payout gate rather than a public credential check.',
    /** The short form for social copy, where PANDIT_TRUST_LINE does not fit. */
    PANDIT_TRUST_SHORT: hasPanditVetting ? 'Verified pandits' : 'Video proof of every puja',
    /** What a supply-side drip may say about the badge. The false version
     * promised that a "verification badge moves you to top of search"; nothing
     * writes that badge, so nothing can move. */
    SUPPLY_BADGE_LINE: hasPanditVetting
      ? 'Verified pandits rank above unverified ones in search.'
      : 'There is no verification badge to earn yet — we do not run credential checks or reference calls. What moves you up is a complete profile, real offerings and delivered video proof.',
  };
}

export const {
  RECEIPT_NOUN,
  RECEIPT_NOUN_TITLE,
  RECEIPT_SHORT,
  NO_80G_DISCLOSURE,
  DONATION_RECEIPT_LINE,
  withEightyG,
  VERIFIED_ADJ,
  verifiedNoun,
  PANDIT_TRUST_LINE,
  PANDIT_TRUST_SHORT,
  SUPPLY_BADGE_LINE,
} = claimStrings({ has80G: HAS_80G, hasPanditVetting: HAS_PANDIT_VETTING });
