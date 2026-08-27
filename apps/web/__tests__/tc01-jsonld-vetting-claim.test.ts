import { describe, it, expect } from 'vitest';

/**
 * TC-01 (in-lane extension, found 2026-08-28) — lib/jsonld.ts asserts "verified
 * astrologers" in indexed structured data, and no astrologer can be verified.
 *
 * TC-01's own framing is that lib/jsonld.ts is the worst-placed copy of an
 * unbackable promise in the repo, because a JSON-LD payload is machine-readable
 * and syndicated into rich results. The 80G half of that was gated. This half
 * was not, because the lane's vetting guard
 * (__tests__/trust-copy-lane.tc01-tc13.test.tsx, "TC-08") enumerates only
 * lib/faqs.ts, app/why-darshya/page.tsx and app/nri-pujas/page.tsx — the
 * rendered pages — and never lists the structured data. Exactly the gap TC-01
 * was filed for, one claim class over.
 *
 * Read off apps/api/prisma/schema.prisma at HEAD:
 *
 *   model AstrologerProfile   ->  approved Boolean @default(false)   ... and
 *                                 NOTHING else about verification: no
 *                                 isVerified, no aadhaarVerified, no
 *                                 verificationStatus.
 *   model Priest              ->  aadhaarVerified, isVerified, verificationStatus
 *   model Temple              ->  isVerified  (also @@index([isVerified]))
 *
 * So an astrologer cannot be verified — there is nowhere to record it. This is
 * the same fact TC-02 established for /become-astrologer's "Aadhaar +
 * qualification verified badge", which was removed there and left standing
 * here.
 *
 * `approved` IS real and enforced: an admin writes it
 * (apps/api/src/routes/admin-leads.ts sets `approved: true, approvedAt`), and
 * apps/api/src/services/astrology.service.ts admits only an approved
 * AstrologerProfile into a consultation. The honest word is already shipping on
 * the astrology funnel — app/astrology/astrologers/live/LiveAstrologersClient.tsx:300
 * says "Every astrologer here is a real, approved Darshya profile."
 *
 * THE FIX MUST BE SURGICAL. "verified temples" in the same sentence is BACKED:
 * Temple.isVerified is a real, indexed column, and lib/platform-stats.ts now
 * filters its published count on it. A blanket scrub of the word "verified"
 * would delete a true claim to fix a false one, so the temple half is asserted
 * as still present below.
 *
 * Asserted against the emitted OBJECT rather than the file text: structured
 * data is consumed as a payload, and an object assertion cannot be fooled by a
 * comment (the failure mode this engagement has hit eight times).
 */

import { brandFaqJsonLd } from '../lib/jsonld';

type Faq = {
  mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
};

/** Every answer string Google would ingest from the brand FAQ graph. */
function answers(): string {
  return (brandFaqJsonLd as unknown as Faq).mainEntity
    .map((q) => `${q.name} ${q.acceptedAnswer.text}`)
    .join('\n');
}

describe('TC-01 — the brand FAQ graph claims no vetting the product cannot perform', () => {
  it('does not advertise verified astrologers', () => {
    expect(
      answers(),
      'AstrologerProfile has only `approved` — no isVerified, aadhaarVerified or ' +
        'verificationStatus column exists, so "verified astrologers" is a claim ' +
        'nothing in the product can record, published as machine-readable markup',
    ).not.toMatch(/verified\s+(vedic\s+)?astrologers?/i);
  });

  it('makes no other unrecordable vetting claim about astrologers', () => {
    expect(answers()).not.toMatch(/astrologers?[^.]{0,40}\b(vetted|aadhaar|background[-\s]checked)/i);
  });

  it('still tells devotees they can consult an astrologer', () => {
    // The fix is a correction, not a deletion: the capability is real.
    expect(answers()).toMatch(/astrologers?/i);
  });

  it('keeps the temple verification claim, which IS backed by a real column', () => {
    // Temple.isVerified exists and is indexed; lib/platform-stats.ts filters
    // its published count on it. Removing this would be over-correction.
    expect(answers()).toMatch(/verified temples/i);
  });

  it('still describes priest video proof, which is a shipped feature', () => {
    expect(answers()).toMatch(/video proof/i);
  });
});
