/**
 * Seeds only the contentItem table (idempotent upsert), so we can add new
 * content without re-running every other seed step.
 */
import { PrismaClient } from '@prisma/client';
import { contentData } from './content-data.ts';

const prisma = new PrismaClient();

let upserts = 0;
for (const c of contentData) {
  await prisma.contentItem.upsert({
    where: { slug: c.slug },
    update: {
      type: c.type, title: c.title, titleLocal: c.titleLocal, body: c.body,
      deity: c.deity, language: c.language, durationSeconds: c.durationSeconds,
      tags: c.tags, isPremium: c.isPremium, status: c.status,
      imageUrl: c.imageUrl, audioUrl: c.audioUrl, videoUrl: c.videoUrl ?? null,
      sortOrder: c.sortOrder,
    },
    create: {
      type: c.type, title: c.title, titleLocal: c.titleLocal, slug: c.slug, body: c.body,
      deity: c.deity, language: c.language, durationSeconds: c.durationSeconds,
      tags: c.tags, isPremium: c.isPremium, status: c.status,
      imageUrl: c.imageUrl, audioUrl: c.audioUrl, videoUrl: c.videoUrl ?? null,
      viewCount: 0, likeCount: 0, sortOrder: c.sortOrder,
      publishedAt: new Date('2025-12-01'),
    },
  });
  upserts += 1;
  console.log(`✓ ${c.slug}`);
}
console.log(`\nUpserted ${upserts} content items.`);
await prisma.$disconnect();
