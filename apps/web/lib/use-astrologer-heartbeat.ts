'use client';

import { useEffect } from 'react';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';

/** Fired on window with `detail: { online: boolean }` whenever the server's view of presence is read. */
export const ASTROLOGER_PRESENCE_EVENT = 'darshya:astrologer-presence';

/** Well inside the API's 15-minute decay, so one missed beat does not drop the astrologer. */
export const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

/**
 * Keeps an astrologer who switched "Go online" on actually online.
 *
 * The API decays presence to offline 15 minutes after the last write (the
 * "closed the app" rule) but NOTHING ever wrote again after the toggle: the
 * astrologer pressed Go online, kept working in the portal, and a quarter of an
 * hour later vanished from the directory ("Book a slot" instead of "Consult
 * now") while their own dashboard still read "You are ONLINE".
 *
 * This runs in the portal layout, so it keeps beating on every portal page. It
 * only re-asserts presence the server still reports as online: it never turns an
 * offline astrologer back on, and it stops when the portal is closed, which is
 * what lets the 15-minute decay mean what it says. The server's answer is
 * broadcast so the dashboard toggle follows reality (a server restart clears
 * the in-memory presence too).
 */
export function useAstrologerHeartbeat(accessToken: string | undefined): void {
  useEffect(() => {
    if (!accessToken) return;
    let stopped = false;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const beat = async () => {
      try {
        const r = await fetchWithTimeout(`${API_BASE_URL}/astrologer-portal/online`, { headers }, DATA_FETCH_TIMEOUT_MS);
        if (!r.ok || stopped) return;
        const j = (await r.json()) as { online?: boolean };
        const online = j.online === true;
        window.dispatchEvent(new CustomEvent(ASTROLOGER_PRESENCE_EVENT, { detail: { online } }));
        if (online) {
          await fetchWithTimeout(
            `${API_BASE_URL}/astrologer-portal/online`,
            { method: 'POST', headers, body: JSON.stringify({ online: true }) },
            DATA_FETCH_TIMEOUT_MS,
          );
        }
      } catch {
        // A missed beat is retried on the next tick; nothing to tell the astrologer.
      }
    };

    const id = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [accessToken]);
}
