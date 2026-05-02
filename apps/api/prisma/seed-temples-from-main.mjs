/**
 * One-off temple-only seeder that imports templesData from the canonical
 * seed.ts. Avoids running the full seed (which fails mid-way on User unique
 * collisions). Idempotent: upserts by slug.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inline import via tsx — replicate templesData here.
// Source-of-truth lives in seed.ts; keep this in sync if temples are
// added/changed there.
const { templesData } = await import('./_temples-export.mjs');

let updated = 0, created = 0;
for (const t of templesData) {
  const existing = await prisma.temple.findUnique({ where: { slug: t.slug } });
  await prisma.temple.upsert({
    where: { slug: t.slug },
    update: t,
    create: t,
  });
  if (existing) {
    updated += 1;
    console.log(`  updated: ${t.slug}`);
  } else {
    created += 1;
    console.log(`  created: ${t.slug}`);
  }
}
console.log(`\nDone — created ${created}, updated ${updated}, total ${templesData.length}`);
await prisma.$disconnect();
