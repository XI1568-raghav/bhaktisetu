import { describe, it, expect } from 'vitest';
import { CITIES } from '../lib/cities';

// lib/cities.ts backs /city/[slug], and `significance` is printed verbatim to
// the reader (app/city/[slug]/page.tsx:105). The Pune record ended its
// significance paragraph with
//
//     R-Q1-G-006: 6th city soft-launch via /mr/pune Marathi landing.
//
// — an internal roadmap ticket id, plus the internal reason the city exists,
// published on a public programmatic-SEO page. It says nothing to a devotee
// looking for a Ganpati puja in Pune and it leaks the release plan.
//
// This walks the RUNTIME records rather than the source file, so the guard
// cannot be satisfied by moving the id into a comment (and cannot be tripped
// by the comment that explains it, either).

/**
 * The shapes the repo's own trackers use for an internal id:
 *   R-Q1-G-006   roadmap item      (quarter / lane / number)
 *   CI-12, I-08, SEC-02, DU-05, A-013, P1-16, I18N-04, CM-08
 * Deliberately anchored on word boundaries and on an uppercase prefix so real
 * prose ("PIN 411", "1893") cannot match.
 */
const INTERNAL_ID =
  /\b(?:R-Q\d+-[A-Z]+-\d+|[A-Z]{1,5}\d*-\d{2,4}(?:-[A-Z0-9]+)?)\b/;

/** Every string reachable from a record, including inside nested arrays. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

describe('lib/cities.ts publishes no internal tracker ids to readers', () => {
  it('the guard actually recognises the id that shipped', () => {
    expect('R-Q1-G-006: 6th city soft-launch').toMatch(INTERNAL_ID);
    expect('CI-12').toMatch(INTERNAL_ID);
    // …and does not fire on the prose these records are made of.
    expect('Lokmanya Tilak revived public Ganesh Chaturthi here in 1893.').not.toMatch(
      INTERNAL_ID,
    );
    expect('Kashi Vishwanath, one of the twelve Jyotirlingas').not.toMatch(INTERNAL_ID);
  });

  it('there is a corpus to check', () => {
    expect(CITIES.length).toBeGreaterThan(20);
  });

  it('no city record carries one', () => {
    for (const c of CITIES) {
      for (const s of strings(c)) {
        expect(s, `${c.slug} publishes an internal id`).not.toMatch(INTERNAL_ID);
      }
    }
  });

  it('Pune still has a real significance paragraph — the fix is a deletion, not a blanking', () => {
    const pune = CITIES.find((c) => c.slug === 'pune');
    expect(pune).toBeDefined();
    expect(pune!.significance).toMatch(/Lokmanya Tilak/);
    expect(pune!.significance.length).toBeGreaterThan(120);
  });
});
