import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { getLiveStatus } from '../lib/darshan-schedule.js';
import { getChannelEmbedInfo, liveStreamUrl, videoEmbedUrl } from '../lib/youtube-feed.js';
import { authenticateUser } from '../middlewares/auth.js';

// YouTube live stream embed URLs for major temples.
// Channel IDs verified 2026-05-02 against https://www.youtube.com/feeds/videos.xml?channel_id=...
// (200 = real channel; 404 = dead). Use only OFFICIAL temple/board YouTube channels.
const TEMPLE_LIVE_STREAMS = [
  // viewerCount / peakViewers are 0 ON PURPOSE, and must stay 0.
  //
  // These rows are the fallback served whenever no temple has
  // liveDarshanEnabled, and :478 passes the value straight to the client —
  // so this table, not the web fallback, is what a devotee normally sees.
  // Until 2026-08-24 it carried invented figures (8450, 28300, 15600, 6200,
  // 12450, 8760, 9400, 5800, 7300). Nothing ever produced them: the only real
  // counter in this file is the `viewerCount: { increment: 1 }` on the join
  // endpoint, which writes to liveDarshanStream rows and never touches these.
  // The web client suppresses the badge entirely at 0 (DarshanBrowser.tsx,
  // DarshanPlayer.tsx:225), which is the intended rendering: no count, no
  // badge. Putting a number back here puts a lie on the flagship surface.
  // Doctrine: apps/web/lib/platform-stats.ts:5-24.

  {
    id: 'live-somnath',
    templeSlug: 'somnath-gujarat',
    templeName: 'Somnath Temple',
    city: 'Veraval',
    deityPrimary: 'Lord Shiva',
    youtubeChannelId: 'UCT1egsvA08YcdMLiEu1DTRg', // Shree Somnath (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCT1egsvA08YcdMLiEu1DTRg&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Live aarti & darshan',
  },
  {
    id: 'live-ttd',
    templeSlug: 'tirumala-tirupati',
    templeName: 'Tirumala Venkateswara Temple (SVBC)',
    city: 'Tirupati',
    deityPrimary: 'Lord Venkateswara',
    youtubeChannelId: 'UCS2Y83GD-fc7qqgNW5uj41g', // SVBC TTD (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCS2Y83GD-fc7qqgNW5uj41g&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: '24/7 Live (SVBC)',
  },
  {
    id: 'live-golden-temple',
    templeSlug: 'golden-temple-amritsar',
    templeName: 'Golden Temple (Harmandir Sahib)',
    city: 'Amritsar',
    deityPrimary: 'Guru Granth Sahib',
    youtubeChannelId: 'UCYn6UEtQ771a_OWSiNBoG8w', // SGPC, Sri Amritsar (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCYn6UEtQ771a_OWSiNBoG8w&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: '24/7 Live Gurbani',
  },
  {
    id: 'live-shirdi',
    templeSlug: 'shirdi-sai-baba',
    templeName: 'Shri Sai Baba Sansthan Temple',
    city: 'Shirdi',
    deityPrimary: 'Sai Baba',
    youtubeChannelId: 'UCKGvJDh7g_Kzocbwy7aKicA', // Shree Saibaba Sansthan Trust (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCKGvJDh7g_Kzocbwy7aKicA&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Kakad Aarti, Dhup Aarti, Shej Aarti',
  },
  {
    id: 'live-kashi',
    templeSlug: 'kashi-vishwanath-varanasi',
    templeName: 'Shri Kashi Vishwanath Temple',
    city: 'Varanasi',
    deityPrimary: 'Lord Shiva',
    youtubeChannelId: 'UCdMj2twWfMHXrWgX5oVdoyA', // Shree Kashi Vishwanath Mandir Trust (official, embedded on shrikashivishwanath.org)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCdMj2twWfMHXrWgX5oVdoyA&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Mangala Aarti, Shringar Aarti, Bhog Aarti',
  },
  {
    id: 'live-siddhivinayak',
    templeSlug: 'siddhivinayak-mumbai',
    templeName: 'Shree Siddhivinayak Temple',
    city: 'Mumbai',
    deityPrimary: 'Lord Ganesha',
    youtubeChannelId: 'UCF9FdiMBENIbM6jb44zWmCQ', // Shree Siddhivinayak Ganapati Temple Trust (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCF9FdiMBENIbM6jb44zWmCQ&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Kakad Aarti 5:30 AM, Madhyanh Aarti 12 PM',
  },
  // Mahakaleshwar has no verified official channel (2026-10-27): the one that was here is an
  // astrology-content channel, not the temple committee's, and showed 'Video unavailable'.
  {
    id: 'live-vaishno-devi',
    templeSlug: 'vaishno-devi',
    templeName: 'Shri Mata Vaishno Devi Temple',
    city: 'Katra',
    deityPrimary: 'Goddess Vaishno Devi',
    youtubeChannelId: 'UCFYQr1l7ereS27SrLJ8bBtw', // Shri Mata Vaishno Devi Shrine Board (official). Embed-allowed (verified 2026-05-04). Reverted from UCziZy6xAlJWPzgIY4duxAeQ Shraddha MH ONE because that channel uses KDigital licensed audio which BLOCKS iframe embed (returns "Video unavailable — content from KDigital, blocked from display on this website").
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCFYQr1l7ereS27SrLJ8bBtw&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Periodic live darshan (Shrine Board)',
  },
  {
    id: 'live-jagannath',
    templeSlug: 'jagannath-puri',
    templeName: 'Jagannath Temple',
    city: 'Puri',
    deityPrimary: 'Lord Jagannath',
    youtubeChannelId: 'UCstacpPsNLSiGcYe7qbF14Q', // Shree Jagannatha Temple Administration, Puri (official, verified 2026-05-02 — daily Dhwaja Bandha Ritual + Patitapabana Darshan)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCstacpPsNLSiGcYe7qbF14Q&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 0,
    peakViewers: 0,
    availability: 'Festival & daily darshan',
  },
];

// Real aarti windows per temple in IST (HH:MM-HH:MM). Used to day-sync the
// fallback /live response with actual temple ritual schedules so we don't
// claim a temple is live at 3pm when its only aarti is the 4am Bhasma.
// Sources: each temple's official site / SGPC / TTD / Shrine Board (verified
// 2026-05-30). Update if a temple changes its public schedule.
const TEMPLE_AARTI_SCHEDULE: Record<string, { regularHours: Record<string, string> }> = {
  'live-somnath': {
    regularHours: {
      morningAarti: '06:30-07:30',
      noonAarti: '11:30-12:30',
      eveningAarti: '18:30-19:30',
    },
  },
  // SVBC / Tirupati: 24/7 live stream.
  'live-ttd': { regularHours: { svbcAarti: '00:00-23:59' } },
  // Golden Temple: continuous Gurbani kirtan.
  'live-golden-temple': { regularHours: { gurbaniAarti: '00:00-23:59' } },
  'live-shirdi': {
    regularHours: {
      kakadAarti: '04:30-05:30',
      madhyanaAarti: '12:00-13:00',
      dhupAarti: '17:45-18:45',
      shejAarti: '21:30-22:30',
    },
  },
  'live-kashi': {
    regularHours: {
      mangalaAarti: '03:00-04:00',
      shringarAarti: '08:00-09:00',
      bhogAarti: '11:30-12:30',
      sandhyaAarti: '19:00-20:00',
      shringarBhogAarti: '21:00-22:00',
    },
  },
  'live-siddhivinayak': {
    regularHours: {
      kakadAarti: '05:30-06:30',
      madhyanhAarti: '12:00-13:00',
      sandhyaAarti: '19:30-20:30',
    },
  },
  // Mahakaleshwar: Bhasma Aarti at 4 AM is the famous one.
  'live-mahakaleshwar': {
    regularHours: {
      bhasmaAarti: '04:00-06:00',
      naivedyaAarti: '07:00-07:45',
      sandhyaAarti: '19:00-19:45',
      shayanAarti: '22:30-23:00',
    },
  },
  // Vaishno Devi: Shrine Board does periodic darshan; morning + evening aartis.
  'live-vaishno-devi': {
    regularHours: {
      morningAarti: '05:30-07:00',
      eveningAarti: '18:30-19:30',
    },
  },
  'live-jagannath': {
    regularHours: {
      mangalaAarti: '04:00-05:00',
      sahanaAarti: '07:00-08:00',
      madhyahnaAarti: '12:00-13:00',
      sandhyaAarti: '19:00-20:00',
    },
  },
};

// Short-alias → canonical slug map. URLs like /darshan/kashi-vishwanath should
// resolve to the temple stored under templeSlug 'kashi-vishwanath-varanasi'.
const SLUG_ALIASES: Record<string, string> = {
  'kashi-vishwanath': 'kashi-vishwanath-varanasi',
  'somnath': 'somnath-gujarat',
  'tirupati': 'tirumala-tirupati',
  'golden-temple': 'golden-temple-amritsar',
  'shirdi': 'shirdi-sai-baba',
  'siddhivinayak': 'siddhivinayak-mumbai',
  'mahakaleshwar': 'mahakaleshwar-ujjain',
};

function resolveSlug(idOrSlug: string): string {
  return SLUG_ALIASES[idOrSlug] ?? idOrSlug;
}

/**
 * PAR-21 (prod sweep 2026-08-12): ONE derivation of "is this live, and what do
 * I play", used by both the listing and the detail endpoint.
 *
 * They disagreed on the same stream id — /live said `live` at
 * `.../kashi-vishwanath-varanasi/live.m3u8`, /:id/stream said `offline` at
 * `.../kashi-vishwanath` — for two independent reasons:
 *
 *   STATUS: /live derives liveness from the temple's aarti window; the detail
 *   route returned LiveDarshanStream.status, a column nothing keeps in step
 *   with the schedule. So a listing that says LIVE opened a page saying offline.
 *
 *   URL: the precedence was exactly reversed. /live reads the stream row first
 *   and falls back to Temple.streamUrl; the detail route preferred the
 *   temple-level default, so wherever both columns are set the player was
 *   handed a different (and staler) manifest than the card promised.
 *
 * A stored status that the schedule cannot speak to — `scheduled`, `ended` —
 * passes through. Only the live/offline claim is derived, and never `live`
 * with nothing to play, which is the gate /live already applies.
 */
function deriveStreamPlayback(input: {
  timingInfo: unknown;
  streamPlaybackUrl: string | null;
  templeStreamUrl: string | null;
  fallbackPlaybackUrl: string | null;
  storedStatus: string;
  now?: Date;
}): { status: string; playbackUrl: string | null; currentSlot: string | null; endsInMin: number | null } {
  const playbackUrl =
    input.streamPlaybackUrl || input.templeStreamUrl || input.fallbackPlaybackUrl || null;
  const schedule = getLiveStatus(input.timingInfo, input.now ?? new Date());
  const isLive = schedule.isLive && Boolean(playbackUrl);

  let status = input.storedStatus;
  if (isLive) status = 'live';
  else if (input.storedStatus === 'live') status = 'offline';

  return {
    status,
    playbackUrl,
    currentSlot: isLive && schedule.isLive ? schedule.current.label : null,
    endsInMin: isLive && schedule.isLive ? schedule.endsInMin : null,
  };
}

/** Exported for the PAR-21 consistency test — pure, no Fastify, no Prisma. */
export const __testing = { deriveStreamPlayback };

// In-process cache for /live (TTL 30s). Drops landing-page TTFB from 3+s
// (Prisma cold connection on Render free tier) to <50ms on warm hits.
// Aarti windows tick by the minute, so 30s staleness is invisible to users.
/**
 * SCAL-04: hard cap on the /live temple scan. Sized far above the live temple
 * count so it never truncates a real page, and low enough that the response can
 * never be sized by the temple table.
 */
const LIVE_DARSHAN_TEMPLE_CAP = 200;

let liveCache: { at: number; payload: unknown } | null = null;
const LIVE_TTL_MS = 30_000;

export async function darshanRoutes(server: FastifyInstance) {
  // GET /live - List streams currently live per Temple.timingInfo aarti window.
  // Live = either DB row marked status='live' OR scheduled aarti window happening
  // RIGHT NOW per Temple.timingInfo. Falls back to hardcoded YT embeds if DB empty.
  server.get('/live', async (_request, reply) => {
    if (liveCache && Date.now() - liveCache.at < LIVE_TTL_MS) {
      reply.header('x-cache', 'HIT');
      return liveCache.payload;
    }
    reply.header('x-cache', 'MISS');
    try {
      // Pull live-darshan temples + streams + timingInfo.
      //
      // SCAL-04 (2026-08-19): this had NO `take`. It read every temple with
      // liveDarshanEnabled, selecting the two widest columns on the model —
      // `images` and the `timingInfo` JSON — on a PUBLIC, unauthenticated
      // route. The 30s in-process cache above bounds how OFTEN it runs, not how
      // much it reads, and a cold cache on a fresh Render dyno runs it in full.
      //
      // It was invisible to the SCAL-04 ratchet for the whole of its life: the
      // detector tested the entire argument text for `take`, and the nested
      // `darshanStream: { take: 1 }` below satisfied it. That blind spot is
      // fixed in lib/unbounded-findmany.scal04.test.ts (topLevelProps), which
      // is what surfaced this read.
      //
      // The cap is well above the current ~20 rows and above any plausible
      // count of temples streaming simultaneously; it exists so the response
      // size cannot be set by the size of the temple table.
      const temples = await prisma.temple.findMany({
        take: LIVE_DARSHAN_TEMPLE_CAP,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          deityPrimary: true,
          images: true,
          streamUrl: true,
          timingInfo: true,
          darshanStream: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        where: { liveDarshanEnabled: true },
      });

      if (temples.length > 0) {
        const liveStreams: Array<Record<string, unknown>> = [];
        const upcomingNote: Array<Record<string, unknown>> = [];
        for (const t of temples) {
          const status = getLiveStatus(t.timingInfo);
          const stream = t.darshanStream[0];
          // Map slug → fallback YT URL from TEMPLE_LIVE_STREAMS
          const fallback = TEMPLE_LIVE_STREAMS.find((s) => s.templeSlug === t.slug);
          const playbackUrl = stream?.playbackUrl || t.streamUrl || fallback?.playbackUrl || null;
          if (status.isLive && playbackUrl) {
            liveStreams.push({
              id: stream?.id ?? `live-${t.slug}`,
              templeId: t.id,
              playbackUrl,
              status: 'live' as const,
              viewerCount: stream?.viewerCount ?? fallback?.viewerCount ?? 0,
              peakViewers: stream?.peakViewers ?? 0,
              isPremium: stream?.isPremium ?? false,
              scheduledStart: null,
              currentSlot: status.current.label,
              endsInMin: status.endsInMin,
              temple: {
                name: t.name,
                slug: t.slug,
                city: t.city,
                deityPrimary: t.deityPrimary,
                images: t.images,
              },
            });
          } else if (!status.isLive && status.nextAarti) {
            upcomingNote.push({
              templeSlug: t.slug,
              nextSlot: status.nextAarti.label,
              startsInMin: status.nextStartsInMin,
            });
          }
        }
        const payload = { streams: liveStreams, total: liveStreams.length, upcoming: upcomingNote };
        liveCache = { at: Date.now(), payload };
        return payload;
      }
    } catch (err) {
      server.log.warn({ err }, 'darshan/live: DB read failed, falling back to hardcoded streams');
    }

    // Fallback: hardcoded streams with real YouTube embeds (DB empty / unreachable).
    // Day-sync against TEMPLE_AARTI_SCHEDULE so we don't mark a temple "live"
    // outside its actual aarti window.
    const liveStreams: Array<Record<string, unknown>> = [];
    const upcomingNote: Array<Record<string, unknown>> = [];
    for (const s of TEMPLE_LIVE_STREAMS) {
      const schedule = TEMPLE_AARTI_SCHEDULE[s.id];
      const status = schedule ? getLiveStatus(schedule) : null;
      const isLive = status ? status.isLive : true;
      if (isLive) {
        liveStreams.push({
          id: s.id,
          templeId: s.id,
          playbackUrl: s.playbackUrl,
          status: 'live' as const,
          viewerCount: s.viewerCount,
          peakViewers: s.peakViewers,
          isPremium: false,
          scheduledStart: null,
          availability: s.availability,
          currentSlot: status && status.isLive ? status.current.label : undefined,
          endsInMin: status && status.isLive ? status.endsInMin : undefined,
          temple: {
            name: s.templeName,
            slug: s.templeSlug,
            city: s.city,
            deityPrimary: s.deityPrimary,
            images: [s.thumbnailUrl],
          },
        });
      } else if (status && !status.isLive && status.nextAarti) {
        upcomingNote.push({
          templeSlug: s.templeSlug,
          nextSlot: status.nextAarti.label,
          startsInMin: status.nextStartsInMin,
        });
      }
    }

    const payload = { streams: liveStreams, total: liveStreams.length, upcoming: upcomingNote };
    liveCache = { at: Date.now(), payload };
    return payload;
  });

  // GET /scheduled - List upcoming scheduled darshan sessions
  server.get('/scheduled', async (request, _reply) => {
    const { page, limit } = request.query as {
      templeId?: string;
      date?: string;
      page?: string;
      limit?: string;
    };

    // Return upcoming aarti schedules as "scheduled" sessions
    const now = new Date();
    const scheduled = TEMPLE_LIVE_STREAMS.slice(0, 5).map((s, i) => {
      const schedTime = new Date(now);
      schedTime.setHours(schedTime.getHours() + (i + 1) * 2);
      return {
        id: `sched-${s.id}`,
        templeId: s.id,
        playbackUrl: s.playbackUrl,
        status: 'scheduled' as const,
        viewerCount: 0,
        peakViewers: 0,
        isPremium: false,
        scheduledStart: schedTime.toISOString(),
        temple: {
          name: s.templeName,
          slug: s.templeSlug,
          city: s.city,
          deityPrimary: s.deityPrimary,
          images: [s.thumbnailUrl],
        },
      };
    });

    return {
      streams: scheduled,
      total: scheduled.length,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    };
  });

  // GET /:id/stream - Get stream details and playback URL
  server.get('/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Check hardcoded streams first - match by id OR templeSlug (incl. short alias).
    // The /darshan/<slug> page hits this endpoint with a slug, not the synthetic id.
    const canonicalSlug = resolveSlug(id);
    const hardcoded = TEMPLE_LIVE_STREAMS.find(
      (s) => s.id === id || s.templeSlug === id || s.templeSlug === canonicalSlug,
    );
    if (hardcoded) {
      // Probe RSS for latest VOD as fallback. The live_stream embed is dark
      // unless the channel is currently broadcasting; recent video keeps the
      // player useful 24/7.
      const feed = await getChannelEmbedInfo(hardcoded.youtubeChannelId);
      const recentUrl = feed.videoId ? videoEmbedUrl(feed.videoId) : null;
      return {
        streamId: id,
        templeId: id,
        templeName: hardcoded.templeName,
        status: 'live',
        playbackUrl: liveStreamUrl(hardcoded.youtubeChannelId),
        recentVideoUrl: recentUrl,
        recentVideoTitle: feed.title,
        youtubeChannelId: hardcoded.youtubeChannelId,
        thumbnailUrl: hardcoded.thumbnailUrl,
        viewerCount: hardcoded.viewerCount,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
      };
    }

    // Try DB
    try {
      const stream = await prisma.liveDarshanStream.findUnique({
        where: { id },
        include: {
          temple: {
            select: {
              id: true, name: true, slug: true,
              city: true, deityPrimary: true,
              // PAR-21: timingInfo is what /live derives liveness from, so the
              // detail route has to read it too or the two cannot agree.
              images: true, streamUrl: true, timingInfo: true,
            },
          },
        },
      });

      if (stream) {
        // PAR-21: same derivation /live uses — same URL precedence, same
        // schedule-driven status. See deriveStreamPlayback.
        const view = deriveStreamPlayback({
          timingInfo: stream.temple.timingInfo,
          streamPlaybackUrl: stream.playbackUrl,
          templeStreamUrl: stream.temple.streamUrl,
          fallbackPlaybackUrl:
            TEMPLE_LIVE_STREAMS.find((s) => s.templeSlug === stream.temple.slug)?.playbackUrl ??
            null,
          storedStatus: stream.status,
        });
        return {
          streamId: stream.id,
          templeId: stream.templeId,
          templeName: stream.temple.name,
          status: view.status,
          playbackUrl: view.playbackUrl,
          // Same two fields /live publishes, so a player can drive its badge
          // from the response instead of hardcoding a red LIVE pill.
          currentSlot: view.currentSlot,
          endsInMin: view.endsInMin,
          thumbnailUrl: Array.isArray(stream.temple.images) && (stream.temple.images as string[]).length > 0
            ? (stream.temple.images as string[])[0]
            : null,
          viewerCount: stream.viewerCount,
          startedAt: stream.actualStart?.toISOString() ?? null,
        };
      }
    } catch {
      // DB error — return not found
    }

    return reply.status(404).send({ error: 'Stream not found' });
  });

  // POST /:id/join - Join a live darshan session (track viewers).
  // Auth required so the viewerCount metric on liveDarshanStream can't
  // be inflated/deflated by anonymous attackers polluting analytics.
  server.post('/:id/join', { preHandler: [authenticateUser] }, async (request, _reply) => {
    const { id } = request.params as { id: string };

    const hardcoded = TEMPLE_LIVE_STREAMS.find((s) => s.id === id);
    if (hardcoded) {
      return {
        streamId: id,
        sessionToken: `session_${id}_${Date.now()}`,
        playbackUrl: hardcoded.playbackUrl,
        message: 'Joined darshan session',
      };
    }

    try {
      await prisma.liveDarshanStream.update({
        where: { id },
        data: { viewerCount: { increment: 1 } },
      });
    } catch {
      // Silently ignore
    }

    return {
      streamId: id,
      sessionToken: `session_${id}_${Date.now()}`,
      playbackUrl: '',
      message: 'Joined darshan session',
    };
  });

  // POST /:id/leave - Leave a live darshan session
  server.post('/:id/leave', { preHandler: [authenticateUser] }, async (request, _reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.liveDarshanStream.update({
        where: { id },
        data: { viewerCount: { decrement: 1 } },
      });
    } catch {
      // Silently ignore
    }

    return { streamId: id, message: 'Left darshan session' };
  });
}
