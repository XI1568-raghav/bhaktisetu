'use client';

import { useEffect, useState } from 'react';
import DarshanChannelPlayer from './DarshanChannelPlayer';
import { fetchStreamPlayback } from '../lib/darshan-client';
import type { ChannelUpload, LiveProbe } from '../lib/youtube-darshan';

/**
 * Channel player whose "is the broadcast on air right now" answer comes from the browser.
 *
 * The page is prerendered with `liveProbe: 'unknown'` (try the live embed first, fall back
 * to the newest upload when YouTube reports it unplayable) and with the uploads list that
 * was current at build time. After load the API's live probe and fresh uploads replace
 * them. This replaced a server-side scrape of youtube.com on every request, which is what
 * pushed the Worker past its CPU limit.
 */
export default function DarshanChannelPlayerLive({
  channelId,
  templeName,
  streamKey,
  initialUploads,
  attribution,
}: {
  channelId: string;
  templeName: string;
  streamKey: string;
  initialUploads: ChannelUpload[];
  attribution?: string | null;
}) {
  const [liveProbe, setLiveProbe] = useState<LiveProbe>('unknown');
  const [uploads, setUploads] = useState(initialUploads);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchStreamPlayback(streamKey, ctrl.signal).then((pb) => {
      if (!pb || ctrl.signal.aborted) return;
      if (pb.liveProbe) setLiveProbe(pb.liveProbe);
      if (pb.uploads && pb.uploads.length > 0) setUploads(pb.uploads.slice(0, 5));
    });
    return () => ctrl.abort();
  }, [streamKey]);

  return (
    <DarshanChannelPlayer
      channelId={channelId}
      templeName={templeName}
      liveProbe={liveProbe}
      uploads={uploads}
      attribution={attribution}
    />
  );
}
