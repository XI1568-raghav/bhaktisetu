'use client';

import { useEffect, useState } from 'react';
import DarshanBrowser from './DarshanBrowser';
import type { DarshanStream } from '../lib/api';
import { fetchLiveDarshanClient, fetchScheduledDarshanClient } from '../lib/darshan-client';

type Upcoming = { templeSlug: string; nextSlot: string; startsInMin: number };

/**
 * /darshan is prerendered, so its stream lists are a build-time snapshot. This wrapper
 * paints that snapshot immediately and swaps in the API's current lists once the browser
 * has fetched them. An empty or failed answer keeps the snapshot / fallback lists, exactly
 * as the old server-side fetch did, so the page never goes blank.
 */
export default function DarshanBrowserLive({
  initialLive,
  initialScheduled,
  initialUpcoming,
  fallbackLive,
  fallbackScheduled,
}: {
  initialLive: DarshanStream[];
  initialScheduled: DarshanStream[];
  initialUpcoming: Upcoming[];
  fallbackLive: DarshanStream[];
  fallbackScheduled: DarshanStream[];
}) {
  const [live, setLive] = useState(initialLive);
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [upcoming, setUpcoming] = useState(initialUpcoming);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const [l, s] = await Promise.all([
        fetchLiveDarshanClient(ctrl.signal),
        fetchScheduledDarshanClient(ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;
      if (l) {
        setLive(l.streams.length > 0 ? l.streams : fallbackLive);
        setUpcoming(l.upcoming);
      }
      if (s) setScheduled(s.length > 0 ? s : fallbackScheduled);
    })();
    return () => ctrl.abort();
    // The fallback lists are module constants on the server page; they never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DarshanBrowser liveStreams={live} scheduledStreams={scheduled} upcomingNotes={upcoming} />;
}
