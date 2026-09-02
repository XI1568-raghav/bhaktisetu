/**
 * TC-01 / TC-08 (trust) — the claims this pitch reel is allowed to animate.
 *
 * `package.json` `ship` renders the reel and copies it to
 * `apps/web/public/pitch/video/darshya-demo-reel.mp4`, so everything drawn in
 * these components is destined for darshya.online. It has not been shipped yet
 * (there is no mp4 under `apps/web/public` today), which is the only reason
 * this was not already a live public claim.
 *
 * What the components drew, before this file existed:
 *
 *   PujaBookingFlow.tsx  "80G Donation Receipt"
 *                        "Bhaktisetu Foundation · 80G Reg. AACTB····"
 *                        step 4 labelled "80G Receipt", a saffron seal reading
 *                        "80G", step 2 labelled "Verified Priest", and
 *                        "Government ID · background-checked"
 *   VectorUI.tsx         "80G Receipts" in the feature strip, "80G" in the
 *                        stat row
 *   DarshyaDemo.tsx      an "80G" trust badge
 *
 * `AACTB····` is an invented registration number. `apps/web/lib/company.ts`
 * records `donationLegal.HAS_80G_VERIFIED: false` with `eightyGNumber` and
 * `pan` both `null`, and `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()`
 * requires a donee 80G number AND PAN read from `gaushala_profiles` columns no
 * route writes — so the receipt the product actually mints prints "Proof of
 * donation — not a tax exemption certificate". Nothing promotes a `Priest` to
 * verified either (`apps/api/src/lib/pandit-vetting.ts` has the writer
 * analysis), and no background check exists anywhere in the repository.
 *
 * A pitch reel is the worst place to overstate a tax position: it is
 * distributed as a file, so it cannot be corrected after the fact.
 *
 * These are GATES. Flip both flags the day the registration and the vetting
 * pipeline exist and every frame returns unchanged — except the registration
 * number, which must be the real one rather than a plausible-looking string.
 */

/** Mirrors `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED`. */
export const HAS_80G = false;

/** Mirrors `apps/api/src/lib/pandit-vetting.ts` `HAS_PANDIT_VETTING`. */
export const HAS_PANDIT_VETTING = false;

/** The receipt card's headline. */
export const RECEIPT_TITLE = HAS_80G ? '80G Donation Receipt' : 'Donation Receipt';

/** The step label in the four-step progress bar. */
export const RECEIPT_STEP_LABEL = HAS_80G ? '80G Receipt' : 'Receipt';

/** The two lines inside the saffron seal. */
export const RECEIPT_SEAL = HAS_80G ? '80G' : 'PDF';
export const SEAL_SUBLINE = HAS_80G ? 'VERIFIED' : 'RECEIPT';

/**
 * The issuer line under the headline. Never render a registration number that
 * is not the real one — a masked-looking string reads as a real registration.
 */
export const RECEIPT_ISSUER = HAS_80G
  ? 'Bhaktisetu Foundation · 80G Reg. — see receipt PDF'
  : 'Darshya · proof of payment, not a tax-exemption certificate';

/** Feature-strip and stat-row wording. */
export const RECEIPT_FEATURE = HAS_80G ? '80G Receipts' : 'Numbered Receipts';
export const RECEIPT_STAT = HAS_80G ? '80G' : 'Receipt';

/** The priest step label and its supporting line. */
export const PRIEST_STEP_LABEL = HAS_PANDIT_VETTING ? 'Verified Priest' : 'Aadhaar KYC';
export const PRIEST_KYC_SUBLINE = HAS_PANDIT_VETTING
  ? 'Government ID · background-checked'
  : 'Government ID on file before payout';

/**
 * The Aadhaar card's own headline and its stamped line. The step label and the
 * subline above were gated in an earlier pass; these two were not, so the frame
 * still read "AADHAAR-VERIFIED PRIEST / Aadhaar Verified" over a subline that
 * had already been corrected to a payout gate. `Priest.aadhaarVerified` has no
 * writer outside `apps/api/prisma/seed.ts` and
 * `apps/api/scripts/seed-demo-users.ts`, and `apps/api/src/routes/providers.ts`
 * reads it as a PAYOUT gate, not as a published credential.
 */
export const PRIEST_CARD_TITLE = HAS_PANDIT_VETTING
  ? 'Aadhaar-verified Priest'
  : 'Pandit payout KYC';
export const PRIEST_CARD_STAMP = HAS_PANDIT_VETTING ? 'Aadhaar Verified' : 'Aadhaar on file';
