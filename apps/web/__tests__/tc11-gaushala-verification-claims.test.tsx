import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-11 (P2, trust) — /gaushala may not certify gaushalas it has never met.
 *
 * At HEAD the page published, over three fixtures typed into the source:
 *
 *   "Our Verified Gaushalas"                                 (section heading)
 *   "Each gaushala is personally verified by our team. We ensure highest
 *    standards of cow care and complete financial transparency."
 *   a green "Verified" badge stamped on every card
 *   "ISKCON-affiliated" / "Government Registered" /
 *   "Organic Products Certified"                             (card credentials)
 *   "Verified Gaushalas — Audited & transparent"             (trust strip)
 *   "All our gaushalas are verified and audited regularly."  (FAQ)
 *   "Every contribution goes to a verified gaushala"         (funding strip)
 *
 * There is no verification, no audit and no financial disclosure anywhere in
 * the product:
 *
 *  - The three cards are `const gaushalas = [...]` in the page. They are not
 *    rows; they name real third-party organisations in Vrindavan, Jaipur and
 *    Mathura and award them affiliation and certification badges that a
 *    developer typed. `/donations` already had the identical fixtures removed
 *    for this reason (S-05) — this page kept them.
 *  - `GaushalaProfile.verified` exists in the schema but nothing in the product
 *    writes it. The admin approval path
 *    (apps/api/src/services/admin.service.ts) sets `approved`, not `verified`;
 *    the gaushala's own portal (routes/gaushala-portal.ts) does not mention
 *    verification at all. The only `verified: true` in apps/api is a MOCK
 *    fixture in provider.service.ts.
 *  - Nothing audits anything, and no endpoint publishes a gaushala's finances.
 *
 * The page already carries the honest listing: <ApprovedProvidersStrip
 * type="gaushala"> renders real approved profiles from the API and shows "No
 * approved gaushalas yet" when there are none. So the fix is deletion plus an
 * accurate word for what approval means — the same shape S-05 shipped.
 */

vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: (p: { heading?: string; subheading?: string }) => (
    <div data-testid="providers-strip">
      <span>{p.heading}</span>
      <span>{p.subheading}</span>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
});

const WEB = path.resolve(__dirname, '..');
const API = path.resolve(WEB, '../api');

/** Source with comments stripped — a note explaining a removed claim is not a claim. */
function pageSource(): string {
  return fs
    .readFileSync(path.join(WEB, 'app/gaushala/page.tsx'), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

async function renderGaushala(): Promise<string> {
  const { default: Page } = await import('../app/gaushala/page');
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  expect(text.length).toBeGreaterThan(500);
  return text;
}

describe('TC-11 — /gaushala claims no verification it does not perform', () => {
  it('does not say each gaushala is personally verified', async () => {
    const text = await renderGaushala();
    expect(text).not.toMatch(/personally verified/i);
    expect(text).not.toMatch(/Our Verified Gaushalas/i);
  });

  it('does not promise complete financial transparency', async () => {
    const text = await renderGaushala();
    expect(text).not.toMatch(/complete financial transparency/i);
    expect(text).not.toMatch(/Audited & transparent/i);
    expect(text).not.toMatch(/verified and audited regularly/i);
  });

  it('stamps no Verified badge and no third-party credential on a fixture', async () => {
    const text = await renderGaushala();
    expect(text).not.toMatch(/ISKCON-affiliated/i);
    expect(text).not.toMatch(/Government Registered/i);
    expect(text).not.toMatch(/Organic Products Certified/i);
  });

  it('no longer hardcodes fictional gaushala cards — same rule as /donations (S-05)', () => {
    const src = pageSource();
    // The `gs_00X` records and the `affiliation` credential they carried are
    // the cards TC-11 is about.
    expect(src).not.toMatch(/id: "gs_00\d"/);
    expect(src).not.toMatch(/affiliation:/);
    expect(src).not.toMatch(/const gaushalas = \[/);
    // NOT asserted: the gaushala NAMES still appear on the eight cow_00X demo
    // records, which DF-08 deliberately kept (deleting them empties the page —
    // there is no real adoptable-cow inventory) under an explicit "sample
    // listings" disclaimer. Those names also reach a live donate CTA as
    // `causeName` from app/gaushala/[id]/page.tsx:549 — reported as a separate
    // defect rather than folded into TC-11, because deciding what the demo cows
    // should say instead is a product call, not a copy correction.
    expect(src).toMatch(/sample listings/i);
  });

  it('still shows the real, DB-backed approved-gaushala listing', async () => {
    // Deletion must not leave the page with no gaushalas at all: the strip
    // fetches approved profiles and renders an honest empty state.
    const src = pageSource();
    expect(src).toMatch(/<ApprovedProvidersStrip/);
    expect(src).toMatch(/type="gaushala"/);
    const text = await renderGaushala();
    expect(text).toMatch(/reviewed and approved|approved/i);
  });
});

describe('TC-11 — the server has no gaushala verification to describe', () => {
  it('the schema has a verified column that the product never writes', () => {
    const schema = fs.readFileSync(path.join(API, 'prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model GaushalaProfile'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).toMatch(/^\s*verified\s+Boolean\s+@default\(false\)/m);
    expect(body).toMatch(/^\s*approved\s+Boolean\s+@default\(false\)/m);
  });

  it('the admin approval path sets approved, not verified', () => {
    const admin = fs.readFileSync(path.join(API, 'src/services/admin.service.ts'), 'utf8');
    const idx = admin.indexOf('prisma.gaushalaProfile.updateMany');
    expect(idx).toBeGreaterThan(-1);
    const block = admin.slice(idx, idx + 200);
    expect(block).toMatch(/approved: updates\.approved/);
    expect(block).not.toMatch(/verified/);
  });

  it('the gaushala portal offers no way to submit or record verification', () => {
    const portal = fs.readFileSync(path.join(API, 'src/routes/gaushala-portal.ts'), 'utf8');
    expect(portal).not.toMatch(/verified/i);
  });
});
