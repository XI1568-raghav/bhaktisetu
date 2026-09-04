import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publishedCompanions, hasPublishedCompanions } from '../lib/companion-roster';

/**
 * TC-06, the money half.
 *
 * Deleting the eight invented companions from lib/yatra-data.ts closed the
 * fabrication on /yatra/companion but left a charge behind on a different page:
 * /yatra/book offered a "Travel companion" add-on at a flat ₹3,500/day, pushed
 * it into `lines`, and let it flow through subtotal -> 5% GST -> total.
 *
 * ₹3,500 was `pricePerDay` on the deleted `rajesh-kumar` row. So the number
 * outlived the person, and with an empty roster the page quoted a real amount
 * for someone nobody could supply. A devotee could have paid it.
 *
 * These tests pin the rule rather than the number: an add-on that depends on
 * supply may only be offered, and may only be priced, while that supply is
 * actually published.
 */

const src = readFileSync(resolve(__dirname, '..', 'app/yatra/book/page.tsx'), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const code = stripComments(src);

describe('the companion add-on cannot be quoted without a companion', () => {
  it('is the state we are actually in — the roster is empty', () => {
    // If this ever fails it is good news, and the two guards below become
    // live-path assertions instead of empty-path ones.
    expect(publishedCompanions).toHaveLength(0);
    expect(hasPublishedCompanions()).toBe(false);
  });

  it('gates the PRICE line on published supply, not just on the toggle', () => {
    // The defect shape: `if (data.addOns.companion) { lines.push(...) }`.
    // The toggle alone is a user preference; it says nothing about whether a
    // companion exists.
    expect(
      code,
      'the companion price line is pushed without consulting the roster',
    ).toMatch(/data\.addOns\.companion\s*&&\s*hasPublishedCompanions\(\)/);
  });

  it('gates the OFFER too, so no toggle appears for unfillable supply', () => {
    expect(code).toMatch(/hasPublishedCompanions\(\)\s*&&\s*\(/);
  });

  it('imports the roster rather than re-deriving availability locally', () => {
    expect(code).toMatch(
      /import\s*\{[^}]*hasPublishedCompanions[^}]*\}\s*from\s*'[^']*companion-roster'/,
    );
  });

  it('never reintroduces a per-day companion rate as a bare literal elsewhere', () => {
    // 3500 may legitimately appear inside the gated branch. What must not exist
    // is a second, ungated occurrence — that is how the first one survived.
    const occurrences = (code.match(/3500/g) ?? []).length;
    expect(occurrences, 'more than one ₹3,500 literal — one of them is ungated').toBeLessThanOrEqual(1);
  });
});
