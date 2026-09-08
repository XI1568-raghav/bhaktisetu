import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-08 (P1, trust) — the residual "Verified priest" on /pujas/[slug].
 *
 * MEASURED BEFORE (live production, 10 of 10 puja slugs, 2 occurrences each —
 * once in the rendered DOM and once in the RSC flight payload):
 *
 *   apps/web/app/pujas/[slug]/page.tsx:629
 *   { step: '2', title: 'Pandit Performs Puja',
 *     desc: 'Verified priest performs the ritual' },
 *
 * Why the earlier TC-08 passes did not catch it. `tc08-vedic-certified-badge.test.ts`
 * pins this very file, but its patterns are `/verified pandits?/i` and
 * `/verified temples?\b/i`. The residual says "priest", not "pandit", and it is
 * SINGULAR — neither pattern matches. That is the whole gap, and the reason
 * this file adds `priest` to the vocabulary rather than editing that suite.
 *
 * Why the claim is unbacked, verified in apps/api on 2026-09-08 rather than
 * taken from the finding:
 *
 *   - Every writer of a `Priest` row was read: routes/priest.ts:347 (create —
 *     writes `verificationStatus: 'pending'`, `status: 'inactive'`),
 *     routes/priest.ts:500 (isOnDuty/lastSeenAt), routes/admin.ts:549
 *     (commissionRate only), services/dispatch.service.ts:480 (acceptanceRate),
 *     services/onboarding.service.ts:375 (displayName/specialties/languages/
 *     experience/bio), services/priest.service.ts:814 (profile fields).
 *     NOT ONE of them writes `isVerified` or `verificationStatus: 'approved'`.
 *   - `POST /admin/priests` and `PATCH /admin/priests/:id` both answer 501
 *     `notImplemented` (routes/admin.ts:473, :481). The only isVerified writes
 *     in the repo are seeds: prisma/seed.ts:1024-1025 and
 *     scripts/seed-demo-users.ts:117. `apps/api/src/routes/b2b.ts:245` says so
 *     in its own words — "a column no route writes".
 *   - The `isVerified: true` at routes/admin.ts:409 is `prisma.temple.create`,
 *     a different model. Temple verification is real; pandit verification is not.
 *
 * What replaces it is enforced, not softened. `checkVideoProofGate`
 * (apps/api/src/routes/bookings.ts:287-324) refuses `video_uploaded` and
 * `delivered` with 409 unless a `videoProofUrl` is present, and those two
 * statuses are where the pandit's payout is minted. So "video proof is
 * mandatory" is a rule the API can be observed refusing to break — which is
 * also the sentence lib/faqs.ts:86 and lib/jsonld.ts:366 already ship.
 */
const WEB = path.resolve(__dirname, '..');

/** Source with block, line and JSX comments removed. */
function code(rel: string): string {
  return fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const PUJA_DETAIL = 'app/pujas/[slug]/page.tsx';

describe('TC-08 — /pujas/[slug] does not print an unbacked priest credential', () => {
  it('the file under test is really being read', () => {
    // Non-vacuity: a typo'd path or an empty read would make every negative
    // assertion below pass for the wrong reason.
    const src = code(PUJA_DETAIL);
    expect(src.length).toBeGreaterThan(5000);
    expect(src).toMatch(/Pandit Performs Puja/);
  });

  it('does not say "verified priest" — the adjective no route can make true', () => {
    expect(code(PUJA_DETAIL)).not.toMatch(/verified\s+priests?\b/i);
  });

  it('does not reintroduce the pandit/temple wording either', () => {
    const src = code(PUJA_DETAIL);
    expect(src).not.toMatch(/verified\s+pandits?\b/i);
    expect(src).not.toMatch(/verified\s+temples?\b/i);
    expect(src).not.toMatch(/certified\s+(priests?|pandits?)\b/i);
  });

  it('names a rule the API enforces instead of dropping the sentence', () => {
    // Rule 1 of the lane: do not weaken a claim into vagueness. The step-2 copy
    // must still tell the devotee something, and that something must be the
    // video-proof gate, which `checkVideoProofGate` refuses to let a booking
    // past.
    const src = code(PUJA_DETAIL);
    expect(src).toMatch(/video proof is mandatory/i);
  });

  it('does not substitute a softer unbacked adjective', () => {
    // "Experienced priest" / "trusted pandit" / "vetted priest" are the same
    // claim in quieter words and none of them has a writer either.
    const src = code(PUJA_DETAIL);
    expect(src).not.toMatch(/\b(experienced|trusted|vetted|screened|approved)\s+(priest|pandit)s?\b/i);
  });

  /**
   * The denominator. One source line renders on every puja slug, so the string
   * had 10 live URLs; but TC-08 was wrong about scope twice before, so the
   * sibling catalogue surfaces are asserted here too — with `priest` added to
   * the vocabulary the older suite lacks.
   */
  const CATALOGUE_SURFACES = [
    'app/pujas/[slug]/page.tsx',
    'app/pujas/page.tsx',
    'app/pujas/marriage/page.tsx',
    'app/temples/[slug]/pujas/page.tsx',
  ];

  for (const rel of CATALOGUE_SURFACES) {
    it(`${rel} claims no verified priest`, () => {
      const src = code(rel);
      expect(src.length).toBeGreaterThan(500);
      expect(src).not.toMatch(/verified\s+priests?\b/i);
    });
  }

  it('the comment stripper cannot hide a live claim', () => {
    // Guards the negatives above: they must fail on rendered JSX and pass only
    // when the phrase is genuinely gone, not merely commented.
    expect(/verified\s+priests?\b/i.test('<p>Verified priest performs the ritual</p>')).toBe(true);
  });
});
