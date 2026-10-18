import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/**
 * YouTube live-darshan discovery cron.
 *
 * Live darshan rows in `live_darshan_streams` are seeded with hard-coded YouTube
 * URLs that go stale within hours when temples end their daily broadcast. This
 * job polls the YouTube Data API for each curated temple channel, finds the
 * currently-live broadcast (if any), and updates `playback_url` / `status` /
 * `youtube_video_id` accordingly. Temples that aren't currently broadcasting
 * are flipped to `offline`.
 *
 * Quota math: YouTube Data API v3 free tier is 10,000 units/day. search.list
 * costs 100 units. We poll N channels every tick — at 30-min cadence (48
 * ticks/day) and 5 channels that's 5 * 48 * 100 = 24,000 units. That exceeds
 * quota at 30-min, so master-cron caps the actual interval at 30-min minimum
 * but the live channel set should not exceed 5 unless quota is raised.
 * See docs/live-darshan-discovery.md for the full ledger.
 *
 * Graceful degradation: if YOUTUBE_API_KEY is missing the job no-ops and
 * returns `{ skipped: true }` — never throws. Per-channel failures are
 * isolated so one 4xx doesn't kill the rest of the run.
 */

// ── Curated channel list ────────────────────────────────────────────────────
// Each entry maps a known temple YouTube channel ID to the DB temple slug
// (matches `temples.slug` in prisma/seed.ts). Channel IDs are the canonical
// `UC...` form, NOT the @handle — the YT Data API search.list `channelId`
// param requires the canonical ID. Resolve a handle to its UC id via
// https://commentpicker.com/youtube-channel-id.php or the channels.list API.
//
// IDs corrected 2026-10-18: the previous five returned 404 from the channel RSS feed.
// Re-verify with apps/api/scripts/validate-darshan-streams.mjs.
// To add a new temple: add the seeded `temples.slug`, find the temple's
// official YouTube channel, get its UC channel ID, add a row below. Quota
// budget allows up to 5 channels at 30-min cadence — see docs.

interface TempleChannel {
  templeSlug: string;
  channelId: string;
  templeName: string;
}

const TEMPLE_CHANNELS: readonly TempleChannel[] = [
  // ISKCON Bangalore — Sri Radha Krishna-chandra Mandir, daily live darshans.
  { templeSlug: 'iskcon-bangalore', channelId: 'UCPXnayBvF7ynbG_I3VOTgIg', templeName: 'ISKCON Bangalore' },
  // Tirumala Tirupati Devasthanams (TTD) — Sri Venkateswara Swamy.
  { templeSlug: 'tirumala-tirupati', channelId: 'UCS2Y83GD-fc7qqgNW5uj41g', templeName: 'TTD Tirumala Tirupati' },
  // Shri Mata Vaishno Devi Shrine Board — Katra, J&K official channel.
  { templeSlug: 'vaishno-devi-katra', channelId: 'UCFYQr1l7ereS27SrLJ8bBtw', templeName: 'Vaishno Devi Shrine Board' },
  // Shri Saibaba Sansthan Trust Shirdi — official live aarti channel.
  { templeSlug: 'shirdi-sai-baba', channelId: 'UCKGvJDh7g_Kzocbwy7aKicA', templeName: 'Shirdi Sai Baba Sansthan' },
  // Shree Siddhivinayak Mumbai — official temple trust channel.
  { templeSlug: 'siddhivinayak-mumbai', channelId: 'UCF9FdiMBENIbM6jb44zWmCQ', templeName: 'Shree Siddhivinayak Temple' },
];

// ── YouTube API response validation ─────────────────────────────────────────
// We only model the fields we actually read; YT returns much more. Zod's
// passthrough on inner objects keeps us forward-compat with API additions.

const youtubeSearchItemSchema = z.object({
  id: z.object({
    kind: z.string(),
    videoId: z.string().optional(),
  }),
  snippet: z
    .object({
      liveBroadcastContent: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
});

const youtubeSearchResponseSchema = z.object({
  items: z.array(youtubeSearchItemSchema).default([]),
});

// ── Result types ────────────────────────────────────────────────────────────

export interface YoutubeDiscoveryChannelResult {
  templeSlug: string;
  status: 'live' | 'offline' | 'error' | 'no-temple' | 'no-stream-row';
  videoId?: string;
  error?: string;
  updated: boolean;
}

export interface YoutubeDiscoveryResult {
  ranAt: string;
  skipped?: boolean;
  reason?: string;
  channels: YoutubeDiscoveryChannelResult[];
  liveCount: number;
  offlineCount: number;
  errorCount: number;
}

// ── Core logic ──────────────────────────────────────────────────────────────

interface LiveLookup {
  videoId: string | null;
}

async function lookupLive(channelId: string, apiKey: string): Promise<LiveLookup> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('eventType', 'live');
  url.searchParams.set('type', 'video');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`youtube search.list ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as unknown;
  const parsed = youtubeSearchResponseSchema.parse(json);
  const live = parsed.items.find(
    (i) => i.id.videoId && i.snippet?.liveBroadcastContent === 'live',
  );
  return { videoId: live?.id.videoId ?? null };
}

async function applyChannel(
  ch: TempleChannel,
  apiKey: string,
): Promise<YoutubeDiscoveryChannelResult> {
  // Look up the temple by slug. If missing (e.g. seed didn't run for this
  // env) skip cleanly — never throw, just log a status row.
  const temple = await prisma.temple.findUnique({
    where: { slug: ch.templeSlug },
    select: { id: true },
  });
  if (!temple) {
    return { templeSlug: ch.templeSlug, status: 'no-temple', updated: false };
  }

  const stream = await prisma.liveDarshanStream.findFirst({
    where: { templeId: temple.id },
    select: {
      id: true,
      playbackUrl: true,
      status: true,
      streamProvider: true,
      youtubeVideoId: true,
      youtubeChannelId: true,
    },
  });
  if (!stream) {
    return { templeSlug: ch.templeSlug, status: 'no-stream-row', updated: false };
  }

  let live: LiveLookup;
  try {
    live = await lookupLive(ch.channelId, apiKey);
  } catch (err) {
    return {
      templeSlug: ch.templeSlug,
      status: 'error',
      updated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (live.videoId) {
    const playbackUrl = `https://www.youtube.com/watch?v=${live.videoId}`;
    // Idempotent: only write if something actually changed. Avoids touching
    // updatedAt and producing spurious audit-log churn on no-op runs.
    const needsUpdate =
      stream.status !== 'live' ||
      stream.youtubeVideoId !== live.videoId ||
      stream.playbackUrl !== playbackUrl ||
      stream.streamProvider !== 'YOUTUBE' ||
      stream.youtubeChannelId !== ch.channelId;
    if (needsUpdate) {
      await prisma.liveDarshanStream.update({
        where: { id: stream.id },
        data: {
          playbackUrl,
          status: 'live',
          streamProvider: 'YOUTUBE',
          youtubeVideoId: live.videoId,
          youtubeChannelId: ch.channelId,
          actualStart: stream.status === 'live' ? undefined : new Date(),
        },
      });
    }
    return {
      templeSlug: ch.templeSlug,
      status: 'live',
      videoId: live.videoId,
      updated: needsUpdate,
    };
  }

  // No live broadcast — flip to offline only if it isn't already.
  const needsOfflineUpdate = stream.status !== 'offline';
  if (needsOfflineUpdate) {
    await prisma.liveDarshanStream.update({
      where: { id: stream.id },
      data: { status: 'offline' },
    });
  }
  return {
    templeSlug: ch.templeSlug,
    status: 'offline',
    updated: needsOfflineUpdate,
  };
}

export async function discoverLiveStreams(): Promise<YoutubeDiscoveryResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'demo-key') {
    return {
      ranAt: new Date().toISOString(),
      skipped: true,
      reason: 'no api key',
      channels: [],
      liveCount: 0,
      offlineCount: 0,
      errorCount: 0,
    };
  }

  const channels: YoutubeDiscoveryChannelResult[] = [];
  for (const ch of TEMPLE_CHANNELS) {
    try {
      channels.push(await applyChannel(ch, apiKey));
    } catch (err) {
      // Outer catch in case of unexpected DB errors. Per-channel HTTP errors
      // are already trapped inside applyChannel.
      channels.push({
        templeSlug: ch.templeSlug,
        status: 'error',
        updated: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const liveCount = channels.filter((c) => c.status === 'live').length;
  const offlineCount = channels.filter((c) => c.status === 'offline').length;
  const errorCount = channels.filter((c) => c.status === 'error').length;

  return {
    ranAt: new Date().toISOString(),
    channels,
    liveCount,
    offlineCount,
    errorCount,
  };
}

// ── Module-level rate limiter ───────────────────────────────────────────────
// Render runs a single instance of the API; tracking lastRun in process memory
// is sufficient. If we ever scale horizontally, replace with a row in a
// `cron_runs` table or Upstash Redis SET-NX.

let lastRunAt: number | null = null;
const MIN_INTERVAL_MS = 30 * 60 * 1000; // 30 min — quota cap, see top of file.

export interface YoutubeDiscoveryGatedResult {
  skipped: boolean;
  reason?: string;
  result?: YoutubeDiscoveryResult;
}

export async function maybeRunYoutubeDiscovery(): Promise<YoutubeDiscoveryGatedResult> {
  const now = Date.now();
  if (lastRunAt !== null && now - lastRunAt < MIN_INTERVAL_MS) {
    const waitMs = MIN_INTERVAL_MS - (now - lastRunAt);
    return { skipped: true, reason: `cooling down, ${Math.ceil(waitMs / 1000)}s remain` };
  }
  lastRunAt = now;
  const result = await discoverLiveStreams();
  return { skipped: false, result };
}

/** Test-only — reset the in-process rate limiter. */
export function __resetYoutubeDiscoveryRateLimit(): void {
  lastRunAt = null;
}
