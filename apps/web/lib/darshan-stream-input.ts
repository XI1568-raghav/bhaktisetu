import type { CreateDarshanStreamInput, DarshanStreamProvider } from './temple-api';

/**
 * The API stores a stream key and a playback URL for every stream, but a temple
 * on YouTube has neither in the sense the other providers do: all it has is a
 * video or channel link. This turns what the manager actually has into the
 * fields the API requires, and says in plain words what is missing.
 */

const VIDEO_ID = /^[\w-]{11}$/;
const CHANNEL_ID = /^UC[\w-]{22}$/;

export type YouTubeSource =
  | { kind: 'video'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'invalid'; message: string };

export function parseYouTubeSource(raw: string): YouTubeSource {
  const text = raw.trim();
  if (!text) return { kind: 'invalid', message: 'Paste the YouTube video link, or the channel ID that starts with UC.' };
  if (VIDEO_ID.test(text)) return { kind: 'video', id: text };
  if (CHANNEL_ID.test(text)) return { kind: 'channel', id: text };

  let url: URL | null = null;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    url = null;
  }
  const host = url?.hostname.replace(/^(www|m)\./, '') ?? '';
  if (!url || !(host === 'youtube.com' || host === 'youtu.be')) {
    return { kind: 'invalid', message: 'That does not look like a YouTube link. Paste the video link (youtube.com/watch?v=… or youtu.be/…).' };
  }

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1] ?? '';
    return VIDEO_ID.test(id) ? { kind: 'video', id } : { kind: 'invalid', message: 'We could not find a video ID in that link.' };
  }

  const channelParam = url.searchParams.get('channel');
  if (channelParam && CHANNEL_ID.test(channelParam)) return { kind: 'channel', id: channelParam };
  const v = url.searchParams.get('v');
  if (v && VIDEO_ID.test(v)) return { kind: 'video', id: v };

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'channel' && parts[1] && CHANNEL_ID.test(parts[1])) return { kind: 'channel', id: parts[1] };
  if ((parts[0] === 'live' || parts[0] === 'embed' || parts[0] === 'shorts') && parts[1] && VIDEO_ID.test(parts[1])) {
    return { kind: 'video', id: parts[1] };
  }
  if (parts[0]?.startsWith('@') || parts[0] === 'c' || parts[0] === 'user') {
    return {
      kind: 'invalid',
      message: 'A channel name link cannot be used. Paste the link of the live video itself, or the channel ID that starts with UC (YouTube Studio, Settings, Channel, Advanced).',
    };
  }
  return { kind: 'invalid', message: 'We could not find a video or channel in that link.' };
}

export interface DarshanFormValues {
  title: string;
  description: string;
  cameraLocation: string;
  provider: DarshanStreamProvider;
  /** YouTube: video link / video ID / channel ID. */
  youtubeSource: string;
  /** IVS and RTMP only. */
  streamKey: string;
  playbackUrl: string;
  /** `datetime-local` value, or empty. */
  scheduledStart: string;
}

export type DarshanFormErrors = Partial<Record<'title' | 'youtubeSource' | 'streamKey' | 'playbackUrl' | 'scheduledStart', string>>;

export type BuildResult =
  | { ok: true; payload: CreateDarshanStreamInput }
  | { ok: false; errors: DarshanFormErrors };

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildDarshanPayload(v: DarshanFormValues, now: Date = new Date()): BuildResult {
  const errors: DarshanFormErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = 'Give the stream a title, for example "Morning Mangal Aarti".';
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.';

  let scheduledIso: string | undefined;
  if (v.scheduledStart) {
    const d = new Date(v.scheduledStart);
    if (Number.isNaN(d.getTime())) errors.scheduledStart = 'Pick a valid date and time, or leave it blank.';
    else if (d.getTime() < now.getTime() - 60_000) errors.scheduledStart = 'That time has already passed. Pick a future time, or leave it blank.';
    else scheduledIso = d.toISOString();
  }

  const base = {
    title,
    description: v.description.trim() || undefined,
    cameraLocation: v.cameraLocation.trim() || undefined,
    streamProvider: v.provider,
    scheduledStart: scheduledIso,
    // A stream with a start time is "scheduled"; without one it simply waits offline until Go Live.
    status: scheduledIso ? ('scheduled' as const) : ('offline' as const),
  };

  if (v.provider === 'YOUTUBE') {
    const src = parseYouTubeSource(v.youtubeSource);
    if (src.kind === 'invalid') errors.youtubeSource = src.message;
    if (Object.keys(errors).length > 0 || src.kind === 'invalid') return { ok: false, errors };
    return {
      ok: true,
      payload:
        src.kind === 'video'
          ? { ...base, streamKey: src.id, playbackUrl: `https://www.youtube.com/watch?v=${src.id}`, youtubeVideoId: src.id }
          : {
              ...base,
              streamKey: src.id,
              playbackUrl: `https://www.youtube.com/embed/live_stream?channel=${src.id}`,
              youtubeChannelId: src.id,
            },
    };
  }

  const streamKey = v.streamKey.trim();
  const playbackUrl = v.playbackUrl.trim();
  if (!streamKey) {
    errors.streamKey =
      v.provider === 'IVS' ? 'Enter the stream key of your IVS channel.' : 'Enter the stream key your encoder streams with.';
  } else if (streamKey.length > 200) errors.streamKey = 'That stream key is too long.';
  if (!playbackUrl) errors.playbackUrl = 'Enter the address devotees watch from, starting with https://';
  else if (!isHttpUrl(playbackUrl)) errors.playbackUrl = 'The playback address must start with http:// or https://';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: { ...base, streamKey, playbackUrl } };
}
