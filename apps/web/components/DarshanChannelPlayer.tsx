'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import {
  formatPublished,
  liveEmbedUrl,
  videoEmbedUrl,
  type ChannelUpload,
  type LiveProbe,
} from '../lib/youtube-darshan';

export interface DarshanChannelPlayerProps {
  channelId: string;
  templeName: string;
  liveProbe: LiveProbe;
  uploads: ChannelUpload[];
  attribution?: string | null;
}

/** Pure: which embeds to try, in order. */
export function buildAttempts(liveProbe: LiveProbe, channelId: string, uploads: ChannelUpload[]) {
  const recent = uploads.map((u) => ({ kind: 'recent' as const, src: videoEmbedUrl(u.videoId), upload: u }));
  // Known off-air: skip the dark live embed. Unknown or live: try it first.
  return liveProbe === 'offline'
    ? recent
    : [{ kind: 'live' as const, src: liveEmbedUrl(channelId), upload: null }, ...recent];
}

/**
 * Plays the channel live embed when there is a broadcast, otherwise the newest
 * upload (with its publish date). YouTube reports an unplayable embed to the
 * parent via postMessage (`onError`), so a dead one steps to the next candidate
 * instead of leaving "Video unavailable" on screen. No script is loaded.
 */
export default function DarshanChannelPlayer({ channelId, templeName, liveProbe, uploads, attribution }: DarshanChannelPlayerProps) {
  const attempts = buildAttempts(liveProbe, channelId, uploads);
  const [index, setIndex] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const current = attempts[index] ?? null;

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== 'https://www.youtube.com') return;
      if (e.source !== frame.current?.contentWindow) return;
      let data: unknown = e.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data && typeof data === 'object' && (data as { event?: string }).event === 'onError') advance();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [advance]);

  const handshake = () => {
    // Ask the embed to start sending events (including onError) to this window.
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), 'https://www.youtube.com');
  };

  if (!current) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-surface-900 flex flex-col items-center justify-center text-center px-6" role="status">
        <Video className="w-10 h-10 text-saffron-400 mb-3" />
        <p className="text-white font-semibold">No live stream right now</p>
        <p className="text-surface-400 prose-meta mt-1 max-w-sm">
          {templeName} is not broadcasting and we could not load a recent darshan. Please try again shortly.
        </p>
        <a
          href={`https://www.youtube.com/channel/${channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-saffron-400 font-semibold hover:text-saffron-300"
        >
          Open the official YouTube channel <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          key={current.src}
          ref={frame}
          src={current.src}
          onLoad={handshake}
          title={`${current.kind === 'live' ? 'Live darshan' : 'Latest darshan'} - ${templeName}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {current.kind === 'recent' && current.upload && (
        <p className="prose-meta text-surface-300" data-testid="darshan-recent-note">
          No live stream right now. Watch the latest darshan
          {current.upload.publishedAt && formatPublished(current.upload.publishedAt)
            ? `, published ${formatPublished(current.upload.publishedAt)}`
            : ''}
          .
        </p>
      )}
      {attribution && <p className="text-xs text-surface-500">Source: {attribution}.</p>}
    </div>
  );
}
