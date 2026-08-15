/**
 * HN-09 (prod sweep 2026-08-12, P2) — the skip link moved the hash but not focus.
 *
 * Measured on prod: pressing Enter on "Skip to main content" gave
 * `location.hash === '#main'` while `document.activeElement` stayed BODY and
 * `window.scrollY` stayed 0. The reason is in the markup, not the link: the
 * target has no `tabindex`, and a browser will not move focus to an element
 * that is not focusable. The next Tab then restarted at the top of the header —
 * the exact 14-item traversal the link exists to skip.
 *
 * The target is rendered by SiteChrome, which also swaps <main> for a <div> on
 * portal routes (A11Y-15). Both branches must be focusable, otherwise the link
 * silently regresses on /admin, /priest and the six *-portal trees.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

import { SiteChrome } from '../components/SiteChrome';

beforeEach(() => {
  cleanup();
  pathname.current = '/';
});

function renderChrome() {
  return render(
    <SiteChrome header={<header>header</header>} tabs={<nav>tabs</nav>}>
      <h1>Page body</h1>
    </SiteChrome>,
  );
}

describe('HN-09 — the skip-link target can actually receive focus', () => {
  it('gives the consumer <main> a programmatic focus target', () => {
    renderChrome();
    const main = document.getElementById('main');
    expect(main, '#main must exist — the skip link points at it').toBeTruthy();
    expect(main!.tagName.toLowerCase()).toBe('main');
    expect(main!.getAttribute('tabindex')).toBe('-1');
  });

  it('focus() on the target actually lands, which is what the link needs', () => {
    renderChrome();
    const main = document.getElementById('main')!;
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it('keeps the target focusable on portal routes, where it renders as a div', () => {
    pathname.current = '/admin/users';
    renderChrome();
    const target = document.getElementById('main')!;
    expect(target.tagName.toLowerCase()).toBe('div');
    expect(target.getAttribute('tabindex')).toBe('-1');
    target.focus();
    expect(document.activeElement).toBe(target);
  });

  it('does not make the target a tab stop — it must stay skippable in the Tab order', () => {
    renderChrome();
    // tabindex="-1" is programmatically focusable but NOT reachable by Tab.
    // A positive or zero value would insert the whole page body into the
    // sequence, which is a different defect.
    expect(document.getElementById('main')!.getAttribute('tabindex')).not.toBe('0');
  });

  it('still renders the page content it wraps', () => {
    renderChrome();
    expect(screen.getByRole('heading', { name: 'Page body' })).toBeTruthy();
  });
});
