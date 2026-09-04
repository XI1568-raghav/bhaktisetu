/**
 * RES-13 — connectivity recovery.
 *
 * public/sw.js answers a failed navigation with the precached /offline shell.
 * The address bar keeps the route the user actually asked for, so re-issuing
 * the navigation once the network is back lands them where they wanted to go.
 * Nothing did that: before this file, apps/web registered no 'online' listener
 * anywhere, and the shell sat there until the user reloaded by hand.
 *
 * The listeners are deliberately event-driven only. `navigator.onLine` is a
 * poor input for this: it reports the presence of a link, not of reachable
 * network, and it reads `true` for a user sitting on the offline shell behind
 * a captive portal or a dead uplink. Acting on it at mount would put anyone
 * who opens /offline directly into a reload loop. The transition is the
 * signal; the level is not.
 */

export interface ConnectivityHandlers {
  /** Fired on the browser's `online` event — a transition, never mount state. */
  onOnline?: () => void;
  /** Fired on the browser's `offline` event. */
  onOffline?: () => void;
}

/**
 * Attaches connectivity listeners and returns a function that detaches them.
 * Safe to call during SSR: with no `window` it is a no-op returning a no-op.
 */
export function registerConnectivityListeners(
  handlers: ConnectivityHandlers,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const { onOnline, onOffline } = handlers;
  const online = onOnline ? () => onOnline() : null;
  const offline = onOffline ? () => onOffline() : null;

  if (online) window.addEventListener('online', online);
  if (offline) window.addEventListener('offline', offline);

  return () => {
    if (online) window.removeEventListener('online', online);
    if (offline) window.removeEventListener('offline', offline);
  };
}
