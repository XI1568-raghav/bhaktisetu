import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LibraryMegaPanel } from '../components/LibraryMegaPanel';
import { CATEGORY_TREE } from '../lib/category-tree';

/**
 * [HOME-IA] The Library mega-panel is a nav, not an index.
 *
 * Measured on the live DOM at 1440x900 before this change: the panel painted
 * every `subGroups` item in four columns — 46 links in a 1120x655px box, 73% of
 * the viewport, its bottom edge at y=719 over a hero <h1> that starts at y=151.
 * A devotee who brushed the trigger lost the page they were reading.
 *
 * /discover is the real index and always was: 156 links, and every destination
 * this panel used to list bar /shlokas, with the #scriptures / #practice /
 * #saints / #cosmology anchors the area doors point at. So the panel keeps the
 * curated eight, four doors and one browse-all, and the long tail stays on the
 * page built to hold it.
 *
 * RATCHET. The link cap below may be LOWERED when links are removed and must
 * never be raised without re-measuring the panel against the viewport. The
 * floor beneath it is the canary: it exists so a selector that silently stops
 * matching cannot be mistaken for a panel that got smaller.
 */

const library = CATEGORY_TREE.find((c) => c.key === 'library');

describe('[HOME-IA] the Library panel cannot grow back into an index', () => {
  it('the fixture is the real Library category, with its subGroups intact', () => {
    // subGroups must survive in the tree even though the panel no longer paints
    // every item: category-tree-counts.ci12-ci14.test.ts asserts over its
    // flattened items that nav labels state counts the datasets actually hold.
    expect(library).toBeDefined();
    expect(library!.subGroups?.length).toBe(4);
    const flat = (library!.subGroups ?? []).flatMap((g) => g.items);
    expect(flat.length).toBeGreaterThan(30);
  });

  it('holds the panel at or below its measured link budget', () => {
    render(<LibraryMegaPanel category={library!} />);
    const links = screen.getAllByRole('menuitem');

    // RATCHET: 46 -> 12 on 2026-09-04. Seven curated items + four area doors +
    // one browse-all.
    const BUDGET = 12;
    expect(
      links.length,
      `the Library panel grew past ${BUDGET} links. It renders a curated set, ` +
        'not the catalogue — the catalogue is /discover.',
    ).toBeLessThanOrEqual(BUDGET);

    // Canary: a broken query returning 0 links must not read as a win.
    expect(links.length).toBeGreaterThan(8);
  });

  it('does not paint the four-column subGroup wall', () => {
    const { container } = render(<LibraryMegaPanel category={library!} />);
    expect(container.querySelector('.grid-cols-4')).toBeNull();

    // The individual subGroup leaves are the wall. A handful legitimately
    // survive as curated items (Bhagavad Gita, Deities); the deep ones must not.
    for (const href of ['/mahavidyas', '/sapta-rishis', '/pancha-bhoota', '/sacred-trees']) {
      expect(container.querySelector(`a[href="${href}"]`)).toBeNull();
    }
  });

  it('keeps one door per area, pointing at anchors /discover really has', () => {
    render(<LibraryMegaPanel category={library!} />);
    for (const g of library!.subGroups ?? []) {
      expect(screen.getByRole('menuitem', { name: g.heading })).toHaveAttribute(
        'href',
        g.hubHref,
      );
    }
  });

  it('offers exactly one route to /discover', () => {
    // items[0] is "Discover All Guides" -> /discover, which was also the
    // featured tile and the browse-all strip: three controls, one destination.
    render(<LibraryMegaPanel category={library!} />);
    const toDiscover = screen
      .getAllByRole('menuitem')
      .filter((a) => a.getAttribute('href') === '/discover');
    expect(toDiscover).toHaveLength(1);
    expect(within(toDiscover[0]!).getByText(/browse all 500\+ guides/i)).toBeInTheDocument();
  });

  it('every curated item still carries the description that earns its row', () => {
    // Queried by href, not by accessible name: "Deities" is both a curated item
    // and a substring of the "Saints & Deities" area door, so a name match finds
    // two elements and throws before it can assert anything.
    const { container } = render(<LibraryMegaPanel category={library!} />);
    for (const item of library!.items.filter((i) => i.href !== '/discover')) {
      const link = container.querySelector(`a[href="${item.href}"]`);
      expect(link, `no panel link for ${item.href}`).not.toBeNull();
      expect(link!.textContent).toContain(item.label);
      expect(
        link!.textContent,
        `${item.label} lost its description — the description is the editorial ` +
          'layer that makes seven curated rows worth more than forty-six bare links',
      ).toContain(item.description);
    }
  });
});
