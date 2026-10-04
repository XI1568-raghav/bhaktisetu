/**
 * TC-08 (P1) — the published pandit vetting process has no implementation.
 *
 * The product advertises credential verification, references from at least two
 * temples or senior pandits, a 30-day probationary video review and a
 * per-pandit trust score. None of it exists. `Priest.isVerified`,
 * `Priest.verificationStatus` and `Priest.aadhaarVerified` have no writer
 * anywhere in the codebase outside `apps/api/prisma/seed.ts` — there is no
 * admin approval route, no credential upload, no reference workflow and no
 * per-pandit trust score column. `Priest.aadhaarVerified` is read in exactly
 * one place, `payment.service.ts`, as a PAYOUT gate: it decides whether a
 * pandit can be paid, not whether a devotee's ceremony is performed by someone
 * who was checked.
 *
 * The canonical copy for this finding lives outside the temple surfaces —
 * app/why-darshya/page.tsx ("Aadhaar + gurukul reference + 2 senior pandit refs
 * + 30-day video probation"), lib/faqs.ts and the static "Vedic certified"
 * badge on app/pujas/*. Those are not in this lane and are reported separately.
 * What IS in this lane is every place the temple funnel repeated the claim, and
 * that is what these tests pin: the temple grid metadata, the per-temple puja
 * catalogue (page copy AND its SERP/OG descriptions) and the booking CTA card
 * that appears on every temple page.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import TempleBookPujaCta from '../components/temple/TempleBookPujaCta';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/**
 * Strip comments before every scan. The comment recording that "Verified
 * priests" was removed has to quote the phrase, so a raw scan would match its
 * own documentation and pass while the claim was still rendered.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Every phrase that asserts a vetting step the platform does not perform. */
const UNBACKED_CLAIMS: RegExp[] = [
  /verified priests/i,
  /verified pandits?/i,
  /certified pandits?/i,
  /vedic certified/i,
  /gated on Aadhaar/i,
];

const TEMPLE_SURFACES = [
  'app/temples/(index)/page.tsx',
  'app/temples/[slug]/page.tsx',
  'app/temples/[slug]/pujas/page.tsx',
  'components/temple/TempleBookPujaCta.tsx',
];

describe('TC-08 — no temple surface advertises a vetting step that does not run', () => {
  for (const rel of TEMPLE_SURFACES) {
    it(`${rel} makes no unbacked pandit-vetting claim`, () => {
      const src = stripComments(read(rel));
      for (const claim of UNBACKED_CLAIMS) {
        expect(src).not.toMatch(claim);
      }
    });
  }

  it('the temple puja catalogue does not promise an unconditional 80G receipt', () => {
    const src = stripComments(read('app/temples/[slug]/pujas/page.tsx'));
    // An 80G receipt is only issuable where the receiving trust holds an 80G
    // registration and PAN, so every mention has to carry that condition.
    const mentions = src.match(/80G[^.`]*/g) ?? [];
    expect(mentions.length).toBeGreaterThan(0);
    for (const mention of mentions) {
      expect(mention).toMatch(/where|applicable|registered/i);
    }
  });

  it('says what the platform does instead of what it does not', () => {
    const src = stripComments(read('app/temples/[slug]/pujas/page.tsx'));
    expect(src).toMatch(/video proof/i);
    // The Aadhaar check is described for what it is — a payout gate — and the
    // absent checks are named rather than implied.
    expect(src).toMatch(/payout gate/i);
    expect(src).toMatch(/do not yet run independent credential verification/i);
  });
});

describe('TC-08 — the temple booking CTA card', () => {
  const OFFERINGS = [{ isActive: true, pujaType: { slug: 'rudrabhishek' } }];

  it('no longer sells "Verified priests"', () => {
    const { container } = render(
      <TempleBookPujaCta
        templeSlug="kashi-vishwanath"
        apiTempleSlug="kashi-vishwanath"
        offerings={OFFERINGS as never}
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain('Book Puja via Darshya');
    expect(html).not.toMatch(/Verified priests/i);
    expect(html).toMatch(/Video proof of your ceremony/i);
  });
});
