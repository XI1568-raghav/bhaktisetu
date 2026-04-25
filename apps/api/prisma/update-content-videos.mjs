/**
 * Targeted script: updates only the `videoUrl` field on existing content rows.
 * Avoids re-seeding everything.
 *
 * Usage: cd apps/api && node prisma/update-content-videos.mjs
 */
import { PrismaClient } from '@prisma/client';

const VIDEO_URLS = {
  'om-jai-jagdish-hare-aarti': 'https://www.youtube.com/watch?v=3ucCEjXS9n8',
  'aarti-kunj-bihari-ki': 'https://www.youtube.com/watch?v=EMO1AT1UQf0',
  'jai-ganesh-deva-aarti': 'https://www.youtube.com/watch?v=Yuex2EnsGiY',
  'om-jai-shiv-omkara-aarti': 'https://www.youtube.com/watch?v=BhwOproElxU',
  'om-jai-lakshmi-mata-aarti': 'https://www.youtube.com/watch?v=oec7CXRAfeE',
  'hanuman-chalisa': 'https://www.youtube.com/watch?v=AETFvQonfV8',
  'shiv-chalisa': 'https://www.youtube.com/watch?v=kYFriF5zHMM',
  'durga-chalisa': 'https://www.youtube.com/watch?v=AXvmt88JLWg',
  'gayatri-mantra': 'https://www.youtube.com/watch?v=nwRoHC83wx0',
  'mahamrityunjay-mantra': 'https://www.youtube.com/watch?v=BMDLRW1iDpI',
  'vishnu-sahasranamam': 'https://www.youtube.com/watch?v=ATflA6WOy0I',
  'om-namah-shivaya-mantra': 'https://www.youtube.com/watch?v=ccBcAWE_lIY',
  'hare-krishna-maha-mantra': 'https://www.youtube.com/watch?v=Zdcth9NndEA',
  'ganesh-mantra-om-gam': 'https://www.youtube.com/watch?v=AEN5Gx-mLGc',
  'bajrang-baan': 'https://www.youtube.com/watch?v=h1lT6cxwsPw',
  'twelve-jyotirlingas-pilgrimage-guide': 'https://www.youtube.com/watch?v=UO39dgB8gYo',
  'navratri-festival-guide': 'https://www.youtube.com/watch?v=lZtMMNt_Mnk',
  'temple-architecture-science-spirituality': 'https://www.youtube.com/watch?v=C7Hr8tKiDRk',
  'understanding-panchang-hindu-almanac': 'https://www.youtube.com/watch?v=sxDI6ze1ejs',
  'char-dham-yatra-guide': 'https://www.youtube.com/watch?v=dR1FV---j2g',
  'ganesh-chalisa': 'https://www.youtube.com/watch?v=WyHFSjN0miU',
  'lakshmi-chalisa': 'https://www.youtube.com/watch?v=otWnO-2pwuM',
};

const prisma = new PrismaClient();

let updated = 0;
let missing = 0;
for (const [slug, videoUrl] of Object.entries(VIDEO_URLS)) {
  const row = await prisma.contentItem.findUnique({ where: { slug } });
  if (!row) {
    console.warn(`! row not found for slug: ${slug}`);
    missing += 1;
    continue;
  }
  await prisma.contentItem.update({
    where: { slug },
    data: { videoUrl },
  });
  updated += 1;
  console.log(`✓ ${slug} → ${videoUrl}`);
}
console.log(`\nDone: ${updated} updated, ${missing} missing.`);
await prisma.$disconnect();
