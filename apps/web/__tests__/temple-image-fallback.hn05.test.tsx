/**
 * HN-05 — a dropped Wikimedia fetch renders as a blank tile.
 *
 * Observed on production /temples: of 33 images, one (the Mallikarjuna
 * Jyotirlinga card) had `img.complete === true` with `naturalWidth === 0` and
 * NO 4xx/5xx recorded — the signature of an upstream hotlink throttle dropping
 * the request rather than answering it. A later measurement put it at 49 of 348
 * temple image URLs rate-limiting at 3 concurrent requests.
 *
 * Whether to self-host or put a CDN in front is the owner's call and is not
 * code. What IS code, and is what the finding's fix text asks for, is that a
 * dropped upstream fetch must never leave a hole in the grid: "Add an onError
 * fallback to a local placeholder so a dropped upstream fetch never renders as
 * a blank tile."
 *
 * Two things are locked, because the naive version of this fix is worse than
 * the bug: the fallback must be a LOCAL asset (a remote placeholder shares the
 * failure mode it is compensating for), and it must fire at most once per image
 * (an onError that reassigns a src which itself fails is an infinite request
 * loop that will take a free-tier box down).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { existsSync } from 'node:fs';
import path from 'node:path';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/temples',
}));

import { TemplesBrowser } from '../components/temples/TemplesBrowser';

const WEB = path.resolve(__dirname, '..');

const TEMPLE = {
  id: 't-mallikarjuna',
  slug: 'mallikarjuna-jyotirlinga-srisailam',
  name: 'Mallikarjuna Jyotirlinga (Srisailam)',
  city: 'Srisailam',
  state: 'Andhra Pradesh',
  deityType: 'shiva',
  isJyotirlinga: true,
  isShaktiPeetha: false,
  liveDarshanEnabled: false,
  // The exact URL that failed in production.
  images: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/MKJNTemple.jpg/960px-MKJNTemple.jpg',
  ],
};

function templeImg(): HTMLImageElement {
  const img = document
    .querySelectorAll('img')
    [0] as HTMLImageElement | undefined;
  if (!img) throw new Error('no temple card image rendered');
  return img;
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('HN-05 — a throttled temple image falls back to a local placeholder', () => {
  it('ships the local placeholder the fallback points at', () => {
    // A fallback that 404s is the same blank tile with more requests.
    expect(
      existsSync(path.join(WEB, 'public/images/temple-placeholder.svg')),
      'apps/web/public/images/temple-placeholder.svg',
    ).toBe(true);
  });

  it('swaps to the placeholder when the upstream fetch is dropped', () => {
    render(<TemplesBrowser temples={[TEMPLE] as never} />);
    const img = templeImg();
    expect(img.getAttribute('src')).toContain('/images/temples/kashi-vishwanath');

    fireEvent.error(img);

    expect(img.getAttribute('src')).toBe('/images/temple-placeholder.svg');
    // srcSet must go too — a surviving srcSet re-selects a Wikimedia candidate
    // and the tile is blank again on the next layout.
    expect(img.getAttribute('srcset')).toBeNull();
  });

  it('keeps the temple name reachable, so the card is never a mystery tile', () => {
    render(<TemplesBrowser temples={[TEMPLE] as never} />);
    fireEvent.error(templeImg());
    expect(screen.getByText(/Mallikarjuna/)).toBeTruthy();
    expect(templeImg().getAttribute('alt')).toContain('Mallikarjuna');
  });

  it('fires at most once — a failing placeholder cannot become a request loop', () => {
    render(<TemplesBrowser temples={[TEMPLE] as never} />);
    const img = templeImg();
    fireEvent.error(img);
    const afterFirst = img.getAttribute('src');
    // The placeholder itself erroring must not restart the swap.
    fireEvent.error(img);
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(afterFirst);
  });
});
