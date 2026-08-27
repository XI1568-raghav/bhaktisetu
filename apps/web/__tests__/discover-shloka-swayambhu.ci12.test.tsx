import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';
import { SHLOKAS } from '../lib/shlokas';
import DiscoverPage from '../app/discover/page';

// CI-12, the tail of it.
//
// /jyotirlinga itself was fixed by deriving both numbers off JYOTIRLINGAS
// (app/jyotirlinga/page.tsx:10-11), and lib/category-tree.ts was fixed by
// __tests__/category-tree-counts.ci12-ci14.test.ts. Two copies of the retired
// claim survived in surfaces neither of those tests reaches:
//
//   • app/discover/page.tsx — the wisdom hub advertised /jyotirlinga as
//     "All 12 swayambhu Shiva abodes in canonical order".
//   • lib/shlokas.ts — the Dvadasha Jyotirlinga Stotram gloss described
//     "the twelve self-manifest lingams of light".
//
// Somnath, Kashi Vishwanath and Rameshwar all carry `swayambhu: false`, so
// both sentences contradict the product's own dataset. These assertions read
// the RUNTIME data and the RENDERED hub, not the source text, so a reworded
// claim fails here too and a comment cannot satisfy them.

const SWAYAMBHU_COUNT = JYOTIRLINGAS.filter((j) => j.swayambhu).length;

/** "swayambhu", "svayambhu", "self-manifest(ed)", "self manifest(ed)". */
const SELF_MANIFEST = 's[vw]ayambhu|self[\\s-]manifest';

/**
 * The claim under test: the TOTAL used as the qualifier's own noun phrase —
 * "12 swayambhu abodes", "the twelve self-manifest lingams". The window is at
 * most two intervening words on purpose. A wider window would flag the honest
 * sentence too, because a correct sentence has to name the total ("all 12 …")
 * before it can name the subset ("… 9 swayambhu") — and a guard that fails on
 * the corrected text is a guard that forces the bug back in.
 */
const ALL_TWELVE_SELF_MANIFEST = new RegExp(
  `(?:all\\s+)?(?:twelve|12)\\s+(?:[\\w’'-]+[\\s-]){0,2}(?:${SELF_MANIFEST})`,
  'i',
);
const SELF_MANIFEST_ALL_TWELVE = new RegExp(
  `(?:${SELF_MANIFEST})\\w*\\s+(?:[\\w’'-]+[\\s-]){0,2}(?:all\\s+)?(?:twelve|12)\\b`,
  'i',
);

/** Every string reachable from a record, including inside nested arrays. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

describe('CI-12 — the data really is split', () => {
  it('nine of twelve, not twelve of twelve', () => {
    expect(SWAYAMBHU_COUNT).toBeGreaterThan(0);
    expect(SWAYAMBHU_COUNT).toBeLessThan(JYOTIRLINGAS.length);
  });
});

describe('CI-12 — /discover does not re-publish the retired claim', () => {
  it('never advertises all twelve Jyotirlinga as swayambhu', () => {
    render(<DiscoverPage />);
    const text = document.body.textContent ?? '';

    // Sanity: we are looking at the right page.
    expect(text).toContain('Jyotirlinga');

    expect(text).not.toMatch(ALL_TWELVE_SELF_MANIFEST);
    expect(text).not.toMatch(SELF_MANIFEST_ALL_TWELVE);
    // The exact sentence that shipped, pinned so a revert is unmistakable.
    expect(text).not.toContain('All 12 swayambhu Shiva abodes');
  });

  it('states the number the dataset actually holds', () => {
    render(<DiscoverPage />);
    const text = document.body.textContent ?? '';
    expect(text).toContain(`${SWAYAMBHU_COUNT} swayambhu`);
  });

  it('still counts the abodes off the dataset rather than a literal', () => {
    render(<DiscoverPage />);
    const text = document.body.textContent ?? '';
    expect(text).toContain(`${JYOTIRLINGAS.length} jyotirlinga`);
  });
});

describe('CI-12 — the shloka catalogue does not re-publish it either', () => {
  const tagged = SHLOKAS.filter((s) => s.tags.includes('jyotirlinga'));

  it('there is a Jyotirlinga shloka to check', () => {
    expect(tagged.length).toBeGreaterThan(0);
  });

  it('no Jyotirlinga shloka calls all twelve self-manifest', () => {
    for (const s of tagged) {
      const prose = strings(s).join('  ');
      expect(prose, `${s.slug} contradicts the swayambhu flags`).not.toMatch(
        ALL_TWELVE_SELF_MANIFEST,
      );
      expect(prose, `${s.slug} contradicts the swayambhu flags`).not.toMatch(
        SELF_MANIFEST_ALL_TWELVE,
      );
    }
  });

  it('keeps the stotram gloss itself — the fix is a qualifier, not a deletion', () => {
    const stotram = SHLOKAS.find((s) => s.slug === 'dvadasha-jyotirlinga-stotram-1');
    expect(stotram).toBeDefined();
    expect(stotram!.meaning).toMatch(/lingams of light/i);
    expect(stotram!.meaning).toMatch(/Adi Shankaracharya/i);
  });
});
