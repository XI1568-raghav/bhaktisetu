import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The homepage may not assert a benefit the code does not deliver.
 *
 * Three claims were live on app/page.tsx and components/home/TrustStrip.tsx on
 * 2026-08-23, each contradicted by a shipped constant or a missing column:
 *
 *   "80G Receipts / Tax-deductible donations"
 *     lib/company.ts sets HAS_80G_VERIFIED: false with pan: null and
 *     eightyGNumber: null. DonationForm already branches on that flag and
 *     labels the receipt "proof of your donation; it is not a Section 80G
 *     certificate." The homepage promised the certificate anyway.
 *
 *   "Verified Temples / Manager-signed, on-site audit"
 *     prisma/schema.prisma's Temple model carries isVerified, verificationDate
 *     and trustScore, and NO agreement, MoU, signature, signatory or manager
 *     column. There is no field that could ever record a signature for any
 *     temple, so the claim is unfalsifiable by construction. The seed sets
 *     isVerified: true on all 20 temples with a hardcoded 2025-01-15 date.
 *
 *   "Live video proof"
 *     Proof is a recording the assigned pandit uploads AFTER the booking
 *     reaches 'completed' (booking.service.ts refuses the upload from any
 *     other status). Nothing streams a booked puja. Live streaming exists
 *     only for temple aarti, which is a different product on a different
 *     model (LiveDarshanStream).
 *
 * This is the same doctrine as lib/platform-stats.ts and lib/social-proof.ts:
 * a claim only reaches a page if something in the system backs it. The guard
 * is source-level rather than render-level so it fails on the string being
 * authored, not on a particular render path.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB_ROOT, rel), 'utf8');

/** Strip block and line comments so the audit trail above a deletion does not
 *  itself trip the guard. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const SURFACES = [
  'app/page.tsx',
  'components/home/TrustStrip.tsx',
  'components/home/WorshipStrip.tsx',
  'components/home/HeroCopyVariant.tsx',
  'components/home/NriLaneAbTest.tsx',
];

describe('the homepage does not promise 80G while HAS_80G_VERIFIED is false', () => {
  it('lib/company.ts still reports the flag as false (the premise of this guard)', () => {
    const company = read('lib/company.ts');
    expect(
      /HAS_80G_VERIFIED:\s*false/.test(company),
      'HAS_80G_VERIFIED is no longer false — if 80G registration is genuinely on file, ' +
        'this whole guard should be revisited rather than worked around.',
    ).toBe(true);
  });

  for (const rel of SURFACES) {
    it(`${rel} makes no 80G or tax-deduction claim`, () => {
      const src = stripComments(read(rel));
      expect(
        src,
        `${rel} mentions 80G. lib/company.ts:HAS_80G_VERIFIED is false and both pan and ` +
          'eightyGNumber are null, so no 80G certificate can be issued. Use the wording ' +
          'already shipping in lib/help-articles.ts: "a numbered receipt … proof of payment, ' +
          'not a tax-exemption certificate."',
      ).not.toMatch(/80\s*G/i);

      expect(
        src,
        `${rel} claims donations are tax-deductible. Same reason as above.`,
      ).not.toMatch(/tax[- ]deduct/i);
    });
  }
});

describe('the homepage does not claim temple vetting the schema cannot record', () => {
  it('the Temple model still has no signature or agreement column (the premise)', () => {
    const schema = readFileSync(
      path.resolve(WEB_ROOT, '../api/prisma/schema.prisma'),
      'utf8',
    );
    const model = /model\s+Temple\s*\{([\s\S]*?)\n\}/.exec(schema)?.[1] ?? '';
    expect(model, 'could not locate the Temple model').not.toBe('');
    expect(
      /\b(signedAt|signatory|agreementUrl|mouUrl|managerSignature)\b/.test(model),
      'the Temple model gained a signature field — if temple agreements are now recorded, ' +
        'a "manager-signed" claim may be earned and this guard should be revisited.',
    ).toBe(false);
  });

  for (const rel of SURFACES) {
    it(`${rel} does not claim manager-signed or on-site audit`, () => {
      const src = stripComments(read(rel));
      expect(
        src,
        `${rel} claims temples are manager-signed. No column on the Temple model could ` +
          'record a signature, so this is unfalsifiable by construction.',
      ).not.toMatch(/manager[- ]signed/i);

      expect(
        src,
        `${rel} claims an on-site audit. Nothing in the system records a site visit.`,
      ).not.toMatch(/on[- ]site audit/i);
    });
  }
});

describe('the homepage calls video proof recorded, not live', () => {
  for (const rel of SURFACES) {
    it(`${rel} does not describe puja video proof as live`, () => {
      const src = stripComments(read(rel));
      expect(
        src,
        `${rel} says "live video proof". Proof is a recording uploaded after the booking ` +
          'reaches completed — booking.service.ts refuses the upload from any other status. ' +
          'Live streaming exists only for temple aarti, a different product. ' +
          'Say "recorded video proof".',
      ).not.toMatch(/live\s+video\s+proof/i);

      expect(
        src,
        `${rel} invites the devotee to watch their puja live. Nothing streams a booked puja.`,
      ).not.toMatch(/watch\s+your\s+puja\s+live/i);
    });
  }
});
