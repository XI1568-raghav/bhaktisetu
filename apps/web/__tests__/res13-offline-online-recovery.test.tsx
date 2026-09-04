/**
 * RES-13 — nothing in apps/web recovered when the connection came back.
 *
 * public/sw.js serves the precached /offline shell whenever a navigation
 * fetch throws. The URL in the address bar stays on the route the user asked
 * for, so a reload after reconnection would fetch the real page — but nothing
 * ever issued one. A grep of the whole apps/web tree for an 'online' event
 * listener returned zero hits (the only matches for the word were unrelated
 * query params in lib/astrology-filters.ts and lib/search-relax.ts). The
 * devotee sat on a dead page until they thought to reload by hand.
 *
 * The one hazard worth encoding: recovery must be driven by the 'online'
 * EVENT, never by navigator.onLine at mount. A user who opens /offline
 * directly while connected would otherwise reload forever.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { registerConnectivityListeners } from '../lib/offline-recovery';
import OnlineRecovery from '../app/offline/online-recovery';
import OfflinePage from '../app/offline/page';

function goOnline() {
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

function goOffline() {
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

describe('RES-13 — lib/offline-recovery listens for the browser connectivity events', () => {
  it('calls back when the connection returns', () => {
    const onOnline = vi.fn();
    const stop = registerConnectivityListeners({ onOnline });
    goOnline();
    expect(onOnline).toHaveBeenCalledTimes(1);
    stop();
  });

  it('calls back when the connection drops', () => {
    const onOffline = vi.fn();
    const stop = registerConnectivityListeners({ onOffline });
    goOffline();
    expect(onOffline).toHaveBeenCalledTimes(1);
    stop();
  });

  it('detaches both listeners on cleanup', () => {
    const onOnline = vi.fn();
    const onOffline = vi.fn();
    registerConnectivityListeners({ onOnline, onOffline })();
    goOnline();
    goOffline();
    expect(onOnline).not.toHaveBeenCalled();
    expect(onOffline).not.toHaveBeenCalled();
  });
});

describe('RES-13 — the offline shell reloads itself when the connection returns', () => {
  it('reloads on the online event', () => {
    const reload = vi.fn();
    render(<OnlineRecovery reload={reload} />);
    expect(reload).not.toHaveBeenCalled();
    goOnline();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload merely because the browser reports being online at mount', () => {
    const reload = vi.fn();
    render(<OnlineRecovery reload={reload} />);
    expect(navigator.onLine).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it('tells the user what is happening instead of reloading silently', () => {
    render(<OnlineRecovery reload={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
    goOnline();
    expect(screen.getByRole('status').textContent ?? '').toMatch(/back online/i);
  });
});

describe('RES-13 — the recovery is actually mounted on the offline route', () => {
  it('is wired into app/offline/page.tsx, not merely available', () => {
    const reload = vi.fn();
    vi.spyOn(window.location, 'reload').mockImplementation(reload);

    render(<OfflinePage />);
    expect(screen.queryByRole('status')).toBeNull();

    goOnline();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent ?? '').toMatch(/back online/i);
  });
});
