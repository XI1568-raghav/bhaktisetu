/**
 * PF-04 (prod sweep 2026-08-12, P2) — pandit trust photos are broken images.
 *
 * Console on /pujas/marriage: two GETs to
 * https://images.darshya.online/priests/pandit-ramesh-shastri.jpg and
 * .../pandit-suresh-trivedi.jpg, both net::ERR_NAME_NOT_RESOLVED. Confirmed in
 * the database this session — `priests.avatar_url` holds exactly those two
 * strings for "Pandit Ramesh Shastri" and "Pandit Suresh Trivedi", and the
 * hostname has no DNS record.
 *
 * Both pages already rendered an initials tile, but only when avatarUrl was
 * FALSY. A present-but-dead URL walked straight past it into a broken-image
 * icon, on the page asking for ₹25,000+.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PanditAvatar, panditInitials } from '../app/pujas/PanditAvatar';

/** The exact URL the browser failed to resolve in production. */
const DEAD = 'https://images.darshya.online/priests/pandit-ramesh-shastri.jpg';

/**
 * A URL on a host that DOES resolve.
 *
 * 2026-09-01: the three onError tests below used to drive `DEAD`, because at
 * the time the only defence was reactive — render the <img>, wait for the
 * request to fail, swap. `lib/dead-image-hosts.ts` now drops a known-dead host
 * BEFORE render (no request, no ERR_NAME_NOT_RESOLVED, and correct in the SSR
 * output, where onError never runs), so `DEAD` legitimately produces no <img>
 * to fire an error on — asserted in pf04-dead-host-never-requested.test.tsx.
 *
 * The onError path still has to work, and it is now the LIVE-host case that
 * exercises it: a Commons URL that 404s, a Supabase object that was deleted, a
 * truncated file. Same behaviour, driven through the input that can still reach
 * it.
 */
const LIVE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg';

/** Source with comments removed, so prose cannot satisfy a code guard. */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('PF-04 — a dead avatar URL falls back instead of rendering broken', () => {
  it('renders the image while it is still loading', () => {
    render(<PanditAvatar src={LIVE} name="Pandit Ramesh Shastri" className="w-16 h-16" />);
    const img = screen.getByAltText('Pandit Ramesh Shastri') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(LIVE);
  });

  it('swaps to the initials tile when the fetch fails', () => {
    render(<PanditAvatar src={LIVE} name="Pandit Ramesh Shastri" className="w-16 h-16" />);
    fireEvent.error(screen.getByAltText('Pandit Ramesh Shastri'));

    expect(screen.queryByAltText('Pandit Ramesh Shastri')).toBeNull();
    expect(document.body.textContent).toContain('PS');
  });

  it('leaves no <img> behind after the swap, so there is no request loop', () => {
    const { container } = render(
      <PanditAvatar src={LIVE} name="Pandit Suresh Trivedi" className="w-16 h-16" />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
  });

  it('never issues the request at all for the host with no DNS record', () => {
    // Stronger than the swap: the two URLs the seed wrote are not requested,
    // so there is no net::ERR_NAME_NOT_RESOLVED and no flash of an empty box
    // on the page asking for a five-figure payment.
    const { container } = render(
      <PanditAvatar src={DEAD} name="Pandit Ramesh Shastri" className="w-16 h-16" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('images.darshya.online');
    expect(container.textContent).toContain('PS');
  });

  it('still shows initials when the profile simply has no photo', () => {
    render(<PanditAvatar src={null} name="Demo Pandit" className="w-16 h-16" />);
    expect(document.body.textContent).toContain('DP');
    expect(document.querySelector('img')).toBeNull();
  });

  it('treats an empty string as no photo rather than fetching it', () => {
    render(<PanditAvatar src="   " name="Demo Pandit" className="w-16 h-16" />);
    expect(document.querySelector('img')).toBeNull();
  });

  it('derives initials the way the pages did before', () => {
    expect(panditInitials('Pandit Ramesh Shastri')).toBe('PS');
    expect(panditInitials('Ramesh')).toBe('R');
    expect(panditInitials('   ')).toBe('P');
  });
});

describe('PF-04 — both affected pages route their headshots through it', () => {
  it('the wedding page has no unguarded <img> for a pandit', () => {
    cleanup();
    const src = codeOf('app/pujas/marriage/page.tsx');
    expect(src).toContain('PanditAvatar');
    expect(src).not.toMatch(/<img[\s\S]{0,200}?avatarUrl/);
  });

  it('the home-puja ceremony page has no unguarded <img> for a pandit', () => {
    const src = codeOf('app/pujas/home-puja/[slug]/page.tsx');
    expect(src).toContain('PanditAvatar');
    expect(src).not.toMatch(/<img[\s\S]{0,200}?avatarUrl/);
  });
});
