import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const STREAMS = [
  { templeSlug: 'kashi-vishwanath-varanasi', youtubeChannelId: 'UCkPpdkF8L1xS6Y6FsEX_5xQ', attribution: 'Shri Kashi Vishwanath Temple Official' },
  { templeSlug: 'tirumala-tirupati', youtubeChannelId: 'UCxA_AmpErYRZqvKy3bEZeUw', attribution: 'TTD Devasthanams Official' },
  { templeSlug: 'shirdi-sai-baba', youtubeChannelId: 'UC9UzS2vAQwOzCeMvJzvKB-A', attribution: 'Shri Saibaba Sansthan Trust Shirdi' },
  { templeSlug: 'vaishno-devi-katra', youtubeChannelId: 'UCJq4OJ-AaH0mFC-8AQiqMOg', attribution: 'Shri Mata Vaishno Devi Shrine Board' },
  { templeSlug: 'somnath-gujarat', youtubeChannelId: 'UCZQNL-9F6c7m-XS8bjWl_fA', attribution: 'Somnath Temple Trust' },
  { templeSlug: 'dwarkadhish-dwarka', youtubeChannelId: 'UCJSFLCGdjIb1zDYaGlGm3yQ', attribution: 'Dwarkadhish Temple Official' },
  { templeSlug: 'jagannath-puri', youtubeChannelId: 'UCXmADd1g2GJyGKfMkhwS4Aw', attribution: 'Shree Jagannath Temple Administration' },
  { templeSlug: 'meenakshi-madurai', youtubeChannelId: 'UC0d3I4cFW-x4QKjzMt79kdw', attribution: 'Arulmigu Meenakshi Sundareswarar Temple' },
  { templeSlug: 'iskcon-bangalore', youtubeChannelId: 'UC5JbF9OVVXSO-V-IjnmHqug', attribution: 'ISKCON Bangalore' },
  { templeSlug: 'akshardham-delhi', youtubeChannelId: 'UCNnpWVS0v6cTXGJEKB1qLqg', attribution: 'Swaminarayan Akshardham Delhi' },
  { templeSlug: 'badrinath-uttarakhand', youtubeChannelId: 'UC9bZQ-VtWQ97ABNHcZ3X7zQ', attribution: 'Badrinath-Kedarnath Temples Committee' },
  { templeSlug: 'siddhivinayak-mumbai', youtubeChannelId: 'UCsZ0VtdJxjVKOXDxQjrDOdQ', attribution: 'Shree Siddhivinayak Ganapati Mandir Trust' },
  { templeSlug: 'kapaleeshwarar-chennai', youtubeChannelId: 'UC9I3OlFiEf3nrAyhFnPwGRg', attribution: 'Arulmigu Kapaleeshwarar Temple' },
  { templeSlug: 'dakshineswar-kolkata', youtubeChannelId: 'UCk6_TuiHQ-mAfP9_OeHvQ_w', attribution: 'Dakshineswar Kali Temple' },
  { templeSlug: 'birla-mandir-hyderabad', youtubeChannelId: 'UCFBzGUOY1l0LM5JoUnFAuhg', attribution: 'Birla Mandir Hyderabad' },
  { templeSlug: 'dagdusheth-pune', youtubeChannelId: 'UCkXvI3fVc_6ZqY9-1uEojZQ', attribution: 'Dagdusheth Halwai Ganpati Trust' },
  { templeSlug: 'akshardham-gandhinagar', youtubeChannelId: 'UCxJyLyqqpkY4pFvJQQ-pGuw', attribution: 'Akshardham Gandhinagar' },
  { templeSlug: 'govind-dev-ji-jaipur', youtubeChannelId: 'UCQkjcMTsmkF_IzZkDRy4XnQ', attribution: 'Govind Dev Ji Mandir Jaipur' },
  { templeSlug: 'ramanathaswamy-rameshwaram', youtubeChannelId: 'UCWX8Q2iXNyIQRl_zkW1eqzQ', attribution: 'Sri Ramanathaswamy Temple' },
  { templeSlug: 'lingaraj-bhubaneswar', youtubeChannelId: 'UC0d3I4cFW-x4QKjzMt79kdw', attribution: 'Lingaraj Temple Bhubaneswar' },
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
