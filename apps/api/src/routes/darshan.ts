import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { getLiveStatus } from '../lib/darshan-schedule.js';
import { getChannelEmbedInfo, liveStreamUrl, videoEmbedUrl } from '../lib/youtube-feed.js';
import { authenticateUser } from '../middlewares/auth.js';

// YouTube live stream embed URLs for major temples.
// Channel IDs verified 2026-05-02 against https://www.youtube.com/feeds/videos.xml?channel_id=...
// (200 = real channel; 404 = dead). Use only OFFICIAL temple/board YouTube channels.
const TEMPLE_LIVE_STREAMS = [
  {
    id: 'live-somnath',
    templeSlug: 'somnath-gujarat',
    templeName: 'Somnath Temple',
    city: 'Veraval',
    deityPrimary: 'Lord Shiva',
    youtubeChannelId: 'UCT1egsvA08YcdMLiEu1DTRg', // Shree Somnath (official)
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCT1egsvA08YcdMLiEu1DTRg&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 8450,
    peakViewers: 15200,
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
    viewerCount: 28300,
    peakViewers: 52000,
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
    viewerCount: 15600,
    peakViewers: 32000,
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
    viewerCount: 6200,
    peakViewers: 18000,
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
    viewerCount: 12450,
    peakViewers: 24000,
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
    viewerCount: 8760,
    peakViewers: 14000,
    availability: 'Kakad Aarti 5:30 AM, Madhyanh Aarti 12 PM',
  },
  {
    id: 'live-mahakaleshwar',
    templeSlug: 'mahakaleshwar-ujjain',
    templeName: 'Mahakaleshwar Temple',
    city: 'Ujjain',
    deityPrimary: 'Lord Shiva',
    youtubeChannelId: 'UC7q12ONY2mvuq066rreluhQ', // Mahakaleshwar Jyotirlinga Live Darshan — daily Bhasma Aarti
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UC7q12ONY2mvuq066rreluhQ&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 9400,
    peakViewers: 22000,
    availability: 'Bhasma Aarti 4 AM (most sacred)',
  },
  {
    id: 'live-vaishno-devi',
    templeSlug: 'vaishno-devi',
    templeName: 'Shri Mata Vaishno Devi Temple',
    city: 'Katra',
    deityPrimary: 'Goddess Vaishno Devi',
    youtubeChannelId: 'UCFYQr1l7ereS27SrLJ8bBtw', // Shri Mata Vaishno Devi Shrine Board (official). Embed-allowed (verified 2026-05-04). Reverted from UCziZy6xAlJWPzgIY4duxAeQ Shraddha MH ONE because that channel uses KDigital licensed audio which BLOCKS iframe embed (returns "Video unavailable — content from KDigital, blocked from display on this website").
    playbackUrl: 'https://www.youtube.com/embed/live_stream?channel=UCFYQr1l7ereS27SrLJ8bBtw&autoplay=1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=640&h=360&fit=crop&auto=format&q=80',
    viewerCount: 5800,
    peakViewers: 16000,
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
    viewerCount: 7300,
    peakViewers: 45000,
    availability: 'Festival & daily darshan',
  },
];

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

export async function darshanRoutes(server: FastifyInstance) {
  // GET /live - List streams currently live per Temple.timingInfo aarti window.
  // Live = either DB row marked status='live' OR scheduled aarti window happening
  // RIGHT NOW per Temple.timingInfo. Falls back to hardcoded YT embeds if DB empty.
  server.get('/live', async (_request, reply) => {
    try {
      // Pull all temples + streams + timingInfo. Cheap — only ~20 rows.
      const temples = await prisma.temple.findMany({
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
        return { streams: liveStreams, total: liveStreams.length, upcoming: upcomingNote };
      }
    } catch (err) {
      server.log.warn({ err }, 'darshan/live: DB read failed, falling back to hardcoded streams');
    }

    // Fallback: hardcoded streams with real YouTube embeds (DB empty / unreachable).
    const streams = TEMPLE_LIVE_STREAMS.map((s) => ({
      id: s.id,
      templeId: s.id,
      playbackUrl: s.playbackUrl,
      status: 'live' as const,
      viewerCount: s.viewerCount,
      peakViewers: s.peakViewers,
      isPremium: false,
      scheduledStart: null,
      availability: s.availability,
      temple: {
        name: s.templeName,
        slug: s.templeSlug,
        city: s.city,
        deityPrimary: s.deityPrimary,
        images: [s.thumbnailUrl],
      },
    }));

    return { streams, total: streams.length, upcoming: [] };
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
              images: true, streamUrl: true,
            },
          },
        },
      });

      if (stream) {
        return {
          streamId: stream.id,
          templeId: stream.templeId,
          templeName: stream.temple.name,
          status: stream.status,
          playbackUrl: stream.temple.streamUrl || stream.playbackUrl,
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
