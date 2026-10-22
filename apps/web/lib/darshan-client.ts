// Browser-side fetches for the live parts of /darshan and /darshan/[id].
//
// Why: those pages are prerendered at build time (the Cloudflare Worker free plan allows
// 10 ms CPU per request and its asset cache cannot revalidate, so a time-based ISR page is
// re-rendered per request once stale: error 1102). Anything that changes during the day is
// fetched here, after load, by the visitor's browser instead of by the Worker.
import type { DarshanStream, UpcomingDarshanNote } from './api';
import type { ChannelUpload, LiveProbe } from './youtube-darshan';

function apiBase(): string {
  const candidate = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchLiveDarshanClient(signal?: AbortSignal) {
  const json = await getJson<{ streams?: DarshanStream[]; upcoming?: UpcomingDarshanNote[] }>('/darshan/live', signal);
  if (!json || !Array.isArray(json.streams)) return null;
  return { streams: json.streams, upcoming: json.upcoming ?? [] };
}

export async function fetchScheduledDarshanClient(signal?: AbortSignal) {
  const json = await getJson<{ streams?: DarshanStream[] }>('/darshan/scheduled', signal);
  if (!json || !Array.isArray(json.streams)) return null;
  return json.streams;
}

export interface StreamPlayback {
  liveProbe: LiveProbe;
  uploads: ChannelUpload[];
}

/** `liveProbe` and `uploads` are absent from older API builds; callers keep their defaults. */
export async function fetchStreamPlayback(idOrSlug: string, signal?: AbortSignal): Promise<Partial<StreamPlayback> | null> {
  const json = await getJson<{ liveProbe?: unknown; uploads?: unknown }>(`/darshan/${encodeURIComponent(idOrSlug)}/stream`, signal);
  if (!json) return null;
  const out: Partial<StreamPlayback> = {};
  if (json.liveProbe === 'live' || json.liveProbe === 'offline' || json.liveProbe === 'unknown') out.liveProbe = json.liveProbe;
  if (Array.isArray(json.uploads)) {
    out.uploads = (json.uploads as ChannelUpload[]).filter(
      (u) => u && typeof u.videoId === 'string' && typeof u.publishedAt === 'string',
    );
  }
  return out;
}
