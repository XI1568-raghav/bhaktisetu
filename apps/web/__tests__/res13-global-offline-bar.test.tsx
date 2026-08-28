import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * RES-13 — nothing told the user they were offline, and nothing recovered when
 * the connection came back.
 *
 * `public/sw.js` answers a failed NAVIGATION with the precached /offline shell,
 * and `app/offline/online-recovery.tsx` reloads that shell once the connection
 * returns. But that only covers a user who tried to navigate. A user already
 * sitting on a rendered route whose connection drops sees nothing at all: every
 * subsequent fetch fails, each surface renders its own error, and the product
 * looks broken rather than disconnected.
 *
 * So the bar is global — mounted in the root layout, on every route — and
 * recovery is `router.refresh()` rather than a reload: the user is already on
 * the right route, and a full reload would throw away their scroll position and
 * any client state for something a re-render fixes.
 *
 * THE LOAD-BEARING CONSTRAINT, and the one this file exists to pin:
 * `navigator.onLine` is NEVER read at mount. It reports the presence of a link,
 * not of reachable network, and reads `true` behind a captive portal or a dead
 * uplink. Driving the bar off the level rather than the transition would show
 * "offline" to people who are online, and — worse, on the recovery side — put a
 * captive-portal user into a refresh loop. `lib/offline-recovery.ts` documents
 * the same rule; this asserts it.
 *
 * Confirmed RED before the fix: components/ConnectivityBar.tsx did not exist
 * and app/layout.tsx mounted nothing of the kind.
 */

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}));

import ConnectivityBar from '../components/ConnectivityBar';

const WEB = path.resolve(__dirname, '..');

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function fire(type: 'online' | 'offline') {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
}

beforeEach(() => refresh.mockClear());
afterEach(cleanup);

describe('RES-13 — the offline bar', () => {
  it('shows nothing at mount, whatever navigator.onLine says', () => {
    // The dangerous default. A component that reads the level at mount shows
    // "offline" to a captive-portal user who is, as far as the browser knows,
    // online — and vice versa.
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    render(<ConnectivityBar />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.body.textContent).not.toMatch(/offline/i);
  });

  it('appears on the offline EVENT', async () => {
    render(<ConnectivityBar />);
    fire('offline');
    await waitFor(() => expect(document.body.textContent).toMatch(/offline/i));
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('refreshes the current route on the online event, rather than reloading', async () => {
    render(<ConnectivityBar />);
    fire('offline');
    await waitFor(() => expect(document.body.textContent).toMatch(/offline/i));

    fire('online');
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('says it is back before it stops saying anything', async () => {
    render(<ConnectivityBar />);
    fire('offline');
    await waitFor(() => expect(document.body.textContent).toMatch(/offline/i));
    fire('online');
    await waitFor(() => expect(document.body.textContent).toMatch(/back online/i));
  });

  it('does not refresh on an online event that follows no outage', () => {
    // A bare `online` event with no preceding `offline` means nothing was
    // broken. Refreshing there would make a flapping connection re-render the
    // page repeatedly for no benefit.
    render(<ConnectivityBar />);
    fire('online');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('detaches its listeners on unmount', async () => {
    const { unmount } = render(<ConnectivityBar />);
    unmount();
    fire('offline');
    expect(document.body.textContent).not.toMatch(/offline/i);
  });

  it('reads the level nowhere in its own source', () => {
    const src = stripComments(readFileSync(path.join(WEB, 'components/ConnectivityBar.tsx'), 'utf8'));
    expect(src).not.toMatch(/navigator\.onLine/);
    // And it uses the shared, already-tested registration helper.
    expect(src).toMatch(/registerConnectivityListeners/);
  });
});

describe('RES-13 — it is mounted on every route', () => {
  it('the root layout renders it inside <body>', () => {
    const src = stripComments(readFileSync(path.join(WEB, 'app/layout.tsx'), 'utf8'));
    const bodyStart = src.indexOf('<body');
    const bodyEnd = src.indexOf('</body>');
    expect(bodyStart).toBeGreaterThan(-1);
    expect(bodyEnd).toBeGreaterThan(bodyStart);
    expect(src.slice(bodyStart, bodyEnd)).toMatch(/<ConnectivityBar\b/);
    expect(src).toMatch(/import ConnectivityBar from ["'][^"']*components\/ConnectivityBar["']/);
  });
});
