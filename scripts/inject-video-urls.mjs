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
  'understanding-panchang-hindu-almanac': 'https://www.youtube.com/watch?v=sxDI6ze1ejs',
  'char-dham-yatra-guide': 'https://www.youtube.com/watch?v=dR1FV---j2g',
  'ganesh-chalisa': 'https://www.youtube.com/watch?v=WyHFSjN0miU',
  'lakshmi-chalisa': 'https://www.youtube.com/watch?v=otWnO-2pwuM',
};

const filePath = 'apps/api/prisma/content-data.ts';
let content = readFileSync(filePath, 'utf8');

let injected = 0;
let skipped = 0;
for (const [slug, videoUrl] of Object.entries(VIDEO_URLS)) {
  const slugIdx = content.indexOf(`slug: '${slug}',`);
  if (slugIdx < 0) {
    console.warn(`! slug not found: ${slug}`);
    continue;
  }
  // Find end of THIS item: the next closing `},\n  {` after the slug.
  // For the last item, the end is `},\n];`
  const itemEndPattern = /\},\s*\n\s*\{|\},\s*\n\s*\];/g;
  itemEndPattern.lastIndex = slugIdx;
  const endMatch = itemEndPattern.exec(content);
  const itemEnd = endMatch ? endMatch.index : content.length;
  const itemBody = content.slice(slugIdx, itemEnd);

  // If videoUrl already present in this item, skip
  if (itemBody.includes('videoUrl:')) {
    skipped += 1;
    continue;
  }

  // Insert after the audioUrl line within this item only
  const audioRegex = /audioUrl:\s*null,/g;
  audioRegex.lastIndex = slugIdx;
  const audioMatch = audioRegex.exec(content);
  if (!audioMatch || audioMatch.index >= itemEnd) {
    console.warn(`! no audioUrl in item for: ${slug}`);
    continue;
  }
  const insertion = `audioUrl: null,\n    videoUrl: '${videoUrl}',`;
  content = content.slice(0, audioMatch.index) + insertion + content.slice(audioMatch.index + audioMatch[0].length);
  injected += 1;
  console.log(`+ ${slug}`);
}

writeFileSync(filePath, content);
console.log(`\nInjected ${injected}, skipped ${skipped} (already present).`);
