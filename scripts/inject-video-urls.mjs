import { readFileSync, writeFileSync } from 'node:fs';

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
  // 'understanding-panchang-hindu-almanac': null,
  // 'char-dham-yatra-guide': null,
};

const filePath = 'apps/api/prisma/content-data.ts';
let content = readFileSync(filePath, 'utf8');

// Find each item by slug, then walk forward to find its `audioUrl: null,` line,
// and inject `videoUrl: '...',` immediately after.
let replacements = 0;
for (const [slug, videoUrl] of Object.entries(VIDEO_URLS)) {
  const slugIdx = content.indexOf(`slug: '${slug}',`);
  if (slugIdx < 0) {
    console.warn(`! slug not found: ${slug}`);
    continue;
  }
  // Find the next `audioUrl:` line after the slug
  const audioRegex = /audioUrl:\s*null,/g;
  audioRegex.lastIndex = slugIdx;
  const match = audioRegex.exec(content);
  if (!match) {
    console.warn(`! no audioUrl after slug: ${slug}`);
    continue;
  }
  // Verify the `audioUrl` belongs to THIS item, not a later one
  // (i.e., no other slug appears between slugIdx and match.index)
  const between = content.slice(slugIdx + 1, match.index);
  if (between.includes("slug: '")) {
    console.warn(`! audioUrl not found in item for: ${slug}`);
    continue;
  }
  // Detect if videoUrl already exists for this item
  if (between.includes('videoUrl:')) {
    console.log(`. already has videoUrl: ${slug}`);
    continue;
  }
  const insertion = `audioUrl: null,\n    videoUrl: '${videoUrl}',`;
  content = content.slice(0, match.index) + insertion + content.slice(match.index + match[0].length);
  replacements += 1;
}

writeFileSync(filePath, content);
console.log(`✓ injected videoUrl into ${replacements} items`);
