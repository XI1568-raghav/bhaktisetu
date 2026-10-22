import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Only channels whose page resolves and that are the temple's own (see
// ops/sql/darshan-channels-2026-10.sql for provenance). The previous 19-row list
// carried ids that do not exist on YouTube (channel page has no title, RSS 404)
// and one id reused for two temples; they were removed 2026-10-22, not replaced
// with guesses. Add a row only after the validator reports feed=200.
const STREAMS = [
  { templeSlug: 'golden-temple-amritsar', youtubeChannelId: 'UCYn6UEtQ771a_OWSiNBoG8w', attribution: 'SGPC, Sri Amritsar' },
  { templeSlug: 'shirdi-sai-baba', youtubeChannelId: 'UCKGvJDh7g_Kzocbwy7aKicA', attribution: 'Shree Saibaba Sansthan Trust' },
  { templeSlug: 'siddhivinayak-mumbai', youtubeChannelId: 'UCF9FdiMBENIbM6jb44zWmCQ', attribution: 'Shree Siddhivinayak Ganapati Temple Trust' },
  { templeSlug: 'vaishno-devi-katra', youtubeChannelId: 'UCFYQr1l7ereS27SrLJ8bBtw', attribution: 'Shri Mata Vaishno Devi Shrine Board' },
  { templeSlug: 'dagdusheth-pune', youtubeChannelId: 'UCFUYpQptYcTT_IKWf2GlESg', attribution: 'Shrimant Dagdusheth Halwai Ganpati Trust' },
  { templeSlug: 'iskcon-bangalore', youtubeChannelId: 'UCPXnayBvF7ynbG_I3VOTgIg', attribution: 'ISKCON Bangalore' },
  { templeSlug: 'somnath-gujarat', youtubeChannelId: 'UCT1egsvA08YcdMLiEu1DTRg', attribution: 'Somnath Temple - Official Channel' },
  { templeSlug: 'tirumala-tirupati', youtubeChannelId: 'UCS2Y83GD-fc7qqgNW5uj41g', attribution: 'SVBC TTD' },
  { templeSlug: 'kashi-vishwanath-varanasi', youtubeChannelId: 'UCdMj2twWfMHXrWgX5oVdoyA', attribution: 'Shree Kashi Vishwanath Mandir Trust' },
  { templeSlug: 'jagannath-puri', youtubeChannelId: 'UCstacpPsNLSiGcYe7qbF14Q', attribution: 'Shree Jagannatha Temple Administration, Puri' },
];

async function main() {
  for (const s of STREAMS) {
    const temple = await prisma.temple.findUnique({ where: { slug: s.templeSlug } });
    if (!temple) {
      console.log(`SKIP ${s.templeSlug} — temple not seeded`);
      continue;
    }

    // LiveDarshanStream has no compound unique on templeId; use findFirst → create-or-update.
    const existing = await prisma.liveDarshanStream.findFirst({
      where: { templeId: temple.id },
    });

    const playbackUrl = `https://www.youtube.com/embed/live_stream?channel=${s.youtubeChannelId}`;

    if (existing) {
      await prisma.liveDarshanStream.update({
        where: { id: existing.id },
        data: {
          streamProvider: 'YOUTUBE' as any,
          youtubeChannelId: s.youtubeChannelId,
          attribution: s.attribution,
          playbackUrl,
        } as any,
      });
    } else {
      await prisma.liveDarshanStream.create({
        data: {
          templeId: temple.id,
          streamKey: `youtube:${s.youtubeChannelId}`,
          playbackUrl,
          status: 'live' as any,
          streamProvider: 'YOUTUBE' as any,
          youtubeChannelId: s.youtubeChannelId,
          attribution: s.attribution,
        } as any,
      });
    }
    console.log(`UPSERT ${s.templeSlug}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
