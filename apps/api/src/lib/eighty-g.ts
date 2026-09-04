/**
 * TC-01 (P0, trust) — the Section 80G honesty gate, for the API process.
 *
 * The audit measured this claim across `apps/web` and gated it there; a later
 * wave added `apps/mobile/lib/eighty-g.ts`. Neither counted `apps/api`, which
 * is where the claim is *least* recoverable, because the API does not render a
 * page a reader can re-read — it serves JSON to clients and it hands text to
 * Resend and to WhatsApp. A sent email cannot be edited.
 *
 * Measured on production on 2026-09-01, before this file existed:
 *
 *   $ curl -s https://api.darshya.online/api/v1/gaushala/plans | grep -o '80G tax receipt'
 *   80G tax receipt
 *   80G tax receipt
 *
 * — `services/gaushala.service.ts` `ADOPTION_PLANS` advertised "80G tax
 * receipt" as a feature of the ₹30,000/yr and ₹2,25,000 plans, ungated, on a
 * live 200 response. `apps/web/app/gaushala/page.tsx` had already gated its own
 * copy of that same list, so the web page said "Donation Receipt" while the API
 * behind it said "80G tax receipt".
 *
 * Why the claim is false, in code rather than in policy:
 *
 *   - `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is `false`,
 *     with `pan` and `eightyGNumber` both `null`.
 *   - `lib/pdf-receipt.ts` `is80GEligible()` requires BOTH a donee 80G
 *     registration number AND a donee PAN; without both, the PDF prints
 *     "Proof of donation — not a tax exemption certificate".
 *   - Those two values come from `gaushala_profiles.regn_80g` / `.pan`, which
 *     are SELECTed in exactly one place (`routes/donations.ts`) and are written
 *     by no route in this repository. `is80GEligible()` is therefore false for
 *     every donation, for every donee, always.
 *
 * `apps/api` cannot import from `apps/web`, so the flag is mirrored here and
 * `lib/eighty-g.tc01.test.ts` re-reads `apps/web/lib/company.ts` and fails if
 * the copies ever disagree. Flip all three in the same change on the day the
 * Section 80G(5) certificate is on file, and every sentence gated on it returns
 * unchanged. This is a GATE, not a deletion.
 */
export const HAS_80G = false;

/**
 * MCA Form CSR-1 registration, mirrored from
 * `apps/web/lib/company.ts` `donationLegal.HAS_CSR1_VERIFIED`.
 *
 * Kept beside the 80G flag because the two are asserted together in outbound
 * copy — `scripts/ops/cs005-resend-stale-leads.ts` told temple trusts, in a
 * mailer it actually sends through Resend, "Bhaktisetu Foundation: active 80G
 * + CSR-1 in India" while both flags are false and both registration numbers
 * are null. A CSR-1 claim is the worse of the two: the donor company's own CSR
 * compliance rests on it.
 */
export const HAS_CSR1 = false;

/**
 * What may honestly be said about the platform's registration status, in the
 * Hinglish register the ops mailers use. Both flags, or no claim.
 */
export const COMPLIANCE_LINE: string =
  HAS_80G && HAS_CSR1
    ? 'Bhaktisetu Foundation: active 80G + CSR-1 in India'
    : 'Bhaktisetu Foundation abhi 80G ya CSR-1 registered nahi hai — donation receipt proof of payment hai, tax-exemption certificate nahi';

/** "80G tax receipt" once registered, "Donation receipt" until then. */
export const RECEIPT_NOUN = HAS_80G ? '80G tax receipt' : 'Donation receipt';

/** The phrase only when the registration exists, otherwise `fallback`. */
export function withEightyG(phrase: string, fallback = ''): string {
  return HAS_80G ? phrase : fallback;
}

/**
 * The one-sentence disclosure a donor or a prospective donee is entitled to
 * while the registration is missing. Mirrors the string `lib/pdf-receipt.ts`
 * stamps on the PDF, so outbound copy and the document itself cannot disagree.
 */
export const NO_80G_DISCLOSURE =
  'Every donation gets a numbered receipt PDF by email. It is proof of payment, ' +
  'not a tax-exemption certificate: Darshya holds no Section 80G registration ' +
  'yet, so nothing donated today can be claimed as an 80G deduction.';

/** The same disclosure in the Hinglish register the outreach templates use. */
export const NO_80G_DISCLOSURE_HI =
  'Har donation par ek numbered receipt PDF email hoti hai. Wo proof of payment ' +
  'hai, tax-exemption certificate nahi: Darshya ke paas abhi Section 80G ' +
  'registration nahi hai, is liye aaj kiye gaye donation par 80G deduction ' +
  'claim nahi kiya ja sakta.';
