import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { isDeadImageHost, usableImageSrc, DEAD_IMAGE_HOSTS } from '../lib/dead-image-hosts';
import { PanditAvatar } from '../app/pujas/PanditAvatar';
import { AvatarWithFallback } from '../components/AvatarWithFallback';

/**
 * PF-04 / F066 — the half of the audit's fix that the onError fallback did not
 * cover.
 *
 * The finding: "images.darshya.online does not resolve — pandit trust photos
 * are broken on the wedding page." Its fix has two clauses:
 *
 *   «Either add the DNS record and host the assets, or REPOINT THESE SRC VALUES
 *    at self-hosted /public assets. ALSO add an onError fallback (initials
 *    avatar) so a missing image never renders as a broken icon.»
 *
 * The onError clause is done (PanditAvatar, AvatarWithFallback, seven surfaces,
 * guarded by pf04-dead-avatar-host-surfaces.test.ts). The src clause was not,
 * and the host is still dead — measured 2026-09-01 with production back up:
 *
 *   nslookup images.darshya.online   →  Non-existent domain
 *   curl …/priests/pandit-ramesh-shastri.jpg  →  000 (no connection)
 *   curl https://darshya.online/pujas/marriage | grep -o 'images\.darshya\.online[^"]*'
 *     → 2 img srcs + 2 more in the RSC payload
 *
 * onError is a REACTION: the browser resolves DNS, fails, logs
 * net::ERR_NAME_NOT_RESOLVED, and only then does the tile appear — and never at
 * all on the server render, so the HTML the crawler and the first paint see
 * still contains the broken <img>. Dropping the URL before render removes the
 * request entirely.
 *
 * RED BEFORE: every assertion in "renders no <img> at all" failed — both
 * components emitted `<img src="https://images.darshya.online/…">` and relied
 * on onError. The `isDeadImageHost` unit tests are new API. The "still renders
 * a live URL" tests are the anti-vacuity guards: deleting avatars entirely
 * would satisfy the negative assertions and is not the fix.
 */

const DEAD = 'https://images.darshya.online/priests/pandit-ramesh-shastri.jpg';
const LIVE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/x/y.jpg';

describe('PF-04 — isDeadImageHost', () => {
  it('knows the host the seed wrote into priests.avatar_url', () => {
    expect(isDeadImageHost(DEAD)).toBe(true);
    expect(DEAD_IMAGE_HOSTS).toContain('images.darshya.online');
  });

  it('is case-insensitive about the host', () => {
    expect(isDeadImageHost('https://IMAGES.Darshya.Online/priests/a.jpg')).toBe(true);
  });

  it('does not swallow the apex domain or a different subdomain', () => {
    // A suffix match would kill every image the product actually serves.
    expect(isDeadImageHost('https://darshya.online/logo.svg')).toBe(false);
    expect(isDeadImageHost('https://cdn.images.darshya.online/a.jpg')).toBe(false);
    expect(isDeadImageHost('https://images.darshya.online.evil.test/a.jpg')).toBe(false);
  });

  it('leaves everything else alone', () => {
    expect(isDeadImageHost(LIVE)).toBe(false);
    expect(isDeadImageHost('/priests/local.jpg')).toBe(false);
    expect(isDeadImageHost('not a url at all')).toBe(false);
    expect(isDeadImageHost('')).toBe(false);
    expect(isDeadImageHost(null)).toBe(false);
    expect(isDeadImageHost(undefined)).toBe(false);
  });

  it('usableImageSrc returns null for dead and empty, the URL otherwise', () => {
    expect(usableImageSrc(DEAD)).toBeNull();
    expect(usableImageSrc('   ')).toBeNull();
    expect(usableImageSrc(null)).toBeNull();
    expect(usableImageSrc(LIVE)).toBe(LIVE);
  });
});

describe('PF-04 — a dead-host avatar renders no <img> at all', () => {
  it('PanditAvatar shows initials and issues no request', () => {
    const { container } = render(
      <PanditAvatar src={DEAD} name="Pandit Ramesh Shastri" className="w-16 h-16 rounded-xl" />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.textContent).toContain('PS');
    cleanup();
  });

  it('AvatarWithFallback shows its fallback and issues no request', () => {
    const { container } = render(
      <AvatarWithFallback
        src={DEAD}
        alt="Pandit Ramesh Shastri"
        className="w-12 h-12 rounded-full"
        width={48}
        height={48}
        fallback={<span data-testid="fb">RS</span>}
      />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByTestId('fb')).toBeTruthy();
    cleanup();
  });

  it('no rendered markup anywhere references the dead host', () => {
    const { container } = render(
      <div>
        <PanditAvatar src={DEAD} name="Ramesh Shastri" className="w-16 h-16" />
        <AvatarWithFallback
          src={DEAD}
          alt="Suresh Trivedi"
          className="w-12 h-12"
          width={48}
          height={48}
          fallback={<span>ST</span>}
        />
      </div>,
    );
    expect(container.innerHTML).not.toContain('images.darshya.online');
    cleanup();
  });
});

describe('PF-04 — a live URL is still rendered, with its error path intact', () => {
  it('PanditAvatar still paints a real photo', () => {
    const { container } = render(
      <PanditAvatar src={LIVE} name="Ramesh Shastri" className="w-16 h-16" />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe(LIVE);
    cleanup();
  });

  it('AvatarWithFallback still paints a real photo', () => {
    const { container } = render(
      <AvatarWithFallback
        src={LIVE}
        alt="Ramesh Shastri"
        className="w-12 h-12"
        width={48}
        height={48}
        fallback={<span>RS</span>}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe(LIVE);
    cleanup();
  });

  it('a live host that fails still degrades through onError', () => {
    // The pre-emptive drop must not have REPLACED the reactive fallback: a URL
    // on a host that does resolve can still 404, 403 or serve a truncated file,
    // and onError is the only thing that catches that.
    const { container } = render(
      <PanditAvatar src={LIVE} name="Ramesh Shastri" className="w-16 h-16" />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('RS');
    cleanup();
  });

  it('the same, for AvatarWithFallback', () => {
    const { container } = render(
      <AvatarWithFallback
        src={LIVE}
        alt="Ramesh Shastri"
        className="w-12 h-12"
        width={48}
        height={48}
        fallback={<span data-testid="fb2">RS</span>}
      />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('fb2')).toBeTruthy();
    cleanup();
  });
});
