/**
 * RESP-10 / A11Y-15 — portal routes stopped stacking consumer chrome.
 *
 * Measured at 390x844 (prod sweep 2026-08-12, signed in as pandit@demo.com and
 * admin@demo.com):
 *
 *   /priest  header.fixed.top-0        0 -> 65     (global marketing header)
 *            header.h-16 sticky top:64 64 -> 128   (the portal's own header)
 *            nav.md:hidden.fixed       787 -> 844  (consumer bottom tab bar)
 *            = 185px permanent chrome, 21.9% of the viewport
 *   /admin   the same three bars = 177px
 *   /admin   landmarks {"main":2,...} vs {"main":1,...} on every other page
 *
 * The consumer chrome also leaked in: the header still advertised
 * "Cart (0 items)" and the bottom bar still rendered the devotee "Book" tab
 * while an admin was signed in.
 *
 * This renders the real component with a mocked pathname, so it fails if the
 * gate is removed, if a portal prefix is dropped, or if the <main> offset
 * classes come back on a portal route.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));

import { SiteChrome, isPortalRoute, PORTAL_ROUTE_PREFIXES } from '../components/SiteChrome';

function renderAt(path: string) {
  pathname.value = path;
  return render(
    <SiteChrome
      header={<header data-testid="global-header">Cart (0 items)</header>}
      tabs={<nav data-testid="bottom-tabs">Book</nav>}
    >
      <p>page body</p>
    </SiteChrome>,
  );
}

beforeEach(() => {
  pathname.value = '/';
});

describe('RESP-10 — isPortalRoute', () => {
  it('matches every portal root and its children', () => {
    for (const p of PORTAL_ROUTE_PREFIXES) {
      expect(isPortalRoute(p), p).toBe(true);
      expect(isPortalRoute(`${p}/users`), `${p}/users`).toBe(true);
    }
  });

  it('covers all eight provider/admin surfaces the sweep measured', () => {
    expect([...PORTAL_ROUTE_PREFIXES].sort()).toEqual([
      '/admin',
      '/astrologer-portal',
      '/gaushala-portal',
      '/gurukul-portal',
      '/priest',
      '/store-admin',
      '/temple-portal',
      '/wellness-portal',
    ]);
  });

  it('does not swallow a consumer route that merely starts with the same letters', () => {
    // /priests-public and /admin-guide are not portals; a bare startsWith
    // without the boundary would have eaten them.
    expect(isPortalRoute('/')).toBe(false);
    expect(isPortalRoute('/pujas')).toBe(false);
    expect(isPortalRoute('/priesthood')).toBe(false);
    expect(isPortalRoute('/administrators')).toBe(false);
    expect(isPortalRoute('/store')).toBe(false);
    expect(isPortalRoute('/store/cart')).toBe(false);
  });
});

describe('RESP-10 — consumer routes keep their chrome', () => {
  it('renders the global header and the bottom tab bar on /', () => {
    renderAt('/');
    expect(screen.getByTestId('global-header')).toBeTruthy();
    expect(screen.getByTestId('bottom-tabs')).toBeTruthy();
  });

  it('offsets <main> for the fixed header and the tab bar', () => {
    const { container } = renderAt('/pujas');
    const main = container.querySelector('main#main')!;
    expect(main).toBeTruthy();
    expect(main.className).toContain('pt-16');
    expect(main.className).toContain('pb-20');
  });
});

describe('RESP-10 — portal routes get exactly one top bar and no shopping chrome', () => {
  for (const route of ['/priest', '/admin', '/admin/users', '/temple-portal/bookings']) {
    it(`${route} drops the global marketing header`, () => {
      renderAt(route);
      expect(screen.queryByTestId('global-header')).toBeNull();
    });

    it(`${route} drops the consumer bottom tab bar`, () => {
      renderAt(route);
      expect(screen.queryByTestId('bottom-tabs')).toBeNull();
    });

    it(`${route} drops the 65px top offset and the 80px bottom padding`, () => {
      const { container } = renderAt(route);
      const wrapper = container.querySelector('#main')!;
      expect(wrapper.className).not.toContain('pt-16');
      expect(wrapper.className).not.toContain('pb-20');
    });
  }
});

describe('A11Y-15 — one <main> landmark per page', () => {
  it('the consumer wrapper IS the main landmark', () => {
    const { container } = renderAt('/');
    expect(container.querySelectorAll('main').length).toBe(1);
    expect(container.querySelector('main')!.id).toBe('main');
  });

  it('a portal route yields no outer <main>, so the portal layout owns the landmark', () => {
    // /admin measured {"main":2} against {"main":1} everywhere else, because
    // app/admin/layout.tsx renders its own <main> inside this wrapper.
    const { container } = renderAt('/admin');
    expect(container.querySelectorAll('main').length).toBe(0);
  });

  it('the skip-link target survives either way', () => {
    for (const route of ['/', '/admin']) {
      const { container } = renderAt(route);
      expect(container.querySelector('#main'), route).toBeTruthy();
    }
  });

  it('still renders the page body on a portal route', () => {
    renderAt('/priest');
    expect(screen.getByText('page body')).toBeTruthy();
  });
});
