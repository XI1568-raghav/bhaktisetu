import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryMegaMenu } from '../components/CategoryMegaMenu';
import { CATEGORY_TREE } from '../lib/category-tree';

/**
 * [NAV-IA] `groups` is a presentation layer over `items`, never a second tree.
 *
 * The failure this guards against is silent and expensive. MobileNavV2 renders
 * `category.items` only (MobileNavV2.tsx:272) and never reads `groups`, and
 * category-tree-counts.ci12-ci14.test.ts asserts truthful counts over `items`
 * too. So the day someone adds a link to a `groups` run and forgets `items`,
 * the link exists on desktop, is invisible on every phone, and no other test
 * in the suite notices. The reverse — added to `items`, missed in `groups` —
 * silently drops it from the desktop panel while the mobile drawer still shows
 * it. Both directions are checked below.
 *
 * Grouping was chosen over collapsing links behind "doors" deliberately:
 * NN/g measured ~20% lower discoverability for hidden navigation, a global-nav
 * link is the strongest sitewide internal link a page receives, and /astrology
 * publishes exactly one anchor (#online-astrologers) — so there was nowhere to
 * demote the dosha pages to. Every link stays one click away.
 */

const grouped = CATEGORY_TREE.filter((c) => c.groups?.length);

describe('[NAV-IA] grouped panels stay in sync with their flat item list', () => {
  it('at least one category is grouped (the canary)', () => {
    // Without this, every test below vacuously passes if `groups` is dropped.
    expect(grouped.length).toBeGreaterThan(0);
    expect(grouped.map((c) => c.key)).toContain('astrology');
  });

  for (const category of grouped) {
    describe(category.label, () => {
      const groupHrefs = (category.groups ?? []).flatMap((g) => g.items.map((i) => i.href));
      const itemHrefs = category.items.map((i) => i.href);

      it('every grouped link also exists in `items` (or mobile loses it)', () => {
        for (const href of groupHrefs) {
          expect(itemHrefs, `${href} is in groups but missing from items`).toContain(href);
        }
      });

      it('every `items` link appears in exactly one group (or desktop loses it)', () => {
        for (const href of itemHrefs) {
          const hits = groupHrefs.filter((h) => h === href).length;
          expect(hits, `${href} is in items but appears in ${hits} groups, expected 1`).toBe(1);
        }
      });

      it('group headings are unique, non-empty, and not vague verbs', () => {
        const headings = (category.groups ?? []).map((g) => g.heading);
        expect(new Set(headings).size).toBe(headings.length);
        for (const h of headings) {
          expect(h.trim().length).toBeGreaterThan(2);
          // NN/g names Explore/Discover/Learn as category labels that fail —
          // too little differentiation to support an informed choice.
          expect(h).not.toMatch(/^(explore|discover|learn|more|other|misc)$/i);
        }
      });

      it('renders every link, and every description, in the panel', () => {
        render(<CategoryMegaMenu category={category} />);
        const rendered = screen.getAllByRole('menuitem');
        const renderedHrefs = rendered.map((a) => a.getAttribute('href'));
        for (const item of category.items) {
          expect(renderedHrefs, `${item.href} did not render`).toContain(item.href);
        }
        // The captions must not have silently swallowed the descriptions. A row
        // either paints its description, or — in a `terse` group, where the
        // label is already the thing a devotee searched for — carries it as the
        // title. What must never happen is the description vanishing entirely.
        const terseHrefs = new Set(
          (category.groups ?? []).filter((g) => g.terse).flatMap((g) => g.items.map((i) => i.href)),
        );
        for (const item of category.items) {
          const link = rendered.find((a) => a.getAttribute('href') === item.href);
          if (terseHrefs.has(item.href)) {
            expect(link?.getAttribute('title')).toBe(item.description);
          } else {
            expect(link?.textContent).toContain(item.description);
          }
        }
      });

      it('keeps terse groups rare — descriptions are the differentiator', () => {
        // No competitor mega-panel in this category carries per-item
        // descriptions. Dropping them is a spacing concession, not a default:
        // if most of a panel goes terse, the panel is too big and the answer is
        // to cut links, not prose.
        const groups = category.groups ?? [];
        const terseItems = groups.filter((g) => g.terse).reduce((n, g) => n + g.items.length, 0);
        expect(terseItems).toBeLessThan(category.items.length / 2);
      });

      it('shows each group heading as text, not as a link', () => {
        render(<CategoryMegaMenu category={category} />);
        for (const g of category.groups ?? []) {
          const el = screen.getByText(g.heading);
          expect(el.tagName).not.toBe('A');
          expect(el.closest('a')).toBeNull();
        }
      });
    });
  }
});

describe('[NAV-IA] panel size budget', () => {
  /**
   * RATCHET. May be lowered when links are removed; never raised without
   * re-measuring the panel against a 900px viewport. Baymard: participants
   * "began to feel overwhelmed when presented with more than ~10 subcategory
   * options" — which is why Astrology (14) is grouped rather than left flat,
   * and why an ungrouped panel is held under that line.
   */
  const UNGROUPED_MAX = 10;

  for (const category of CATEGORY_TREE) {
    if (category.groups?.length || category.subGroups?.length) continue;
    it(`${category.label} keeps its flat panel under ${UNGROUPED_MAX} rows`, () => {
      expect(
        category.items.length,
        `${category.label} has ${category.items.length} ungrouped rows. Either cut it, or add \`groups\` to chunk it.`,
      ).toBeLessThanOrEqual(UNGROUPED_MAX);
    });
  }

  it('the cart is not a category', () => {
    // A cart is state, and NavCartButton already carries it in the header with
    // a live count. It was a seventh sibling of Prasad and Idols in Shop.
    for (const category of CATEGORY_TREE) {
      const hrefs = category.items.map((i) => i.href);
      expect(hrefs, `${category.label} lists the cart as a category row`).not.toContain(
        '/store/cart',
      );
    }
  });
});
