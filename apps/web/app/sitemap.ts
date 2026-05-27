import type { MetadataRoute } from 'next';
import { getTemples, getPujaTypes } from '../lib/api';
import { SHLOKAS } from '../lib/shlokas';

const BASE_URL = 'https://darshya.online';

// Build-time fetch tolerant of failures — if the API is asleep/cold or down,
// we still ship a sitemap with the static paths + a curated fallback list
// rather than crash the build or produce an empty sitemap.
const FALLBACK_TEMPLE_SLUGS = [
  'kashi-vishwanath',
  'tirumala-tirupati',
  'siddhivinayak',
  'somnath',
  'jagannath-puri',
  'golden-temple',
  'meenakshi-temple',
  'kedarnath',
  'badrinath',
  'akshardham',
  'mahakaleshwar',
  'dwarkadhish',
  'rameshwaram',
  'vaishno-devi',
];

const FALLBACK_PUJA_SLUGS = [
  'rudrabhishek',
  'satyanarayan-puja',
  'navgraha-puja',
  'ganesh-puja',
  'lakshmi-puja',
  'maha-mrityunjaya',
  'sundarkand-path',
  'kaal-sarp-dosh',
  'mangal-dosh',
  'vivah-puja',
  'griha-pravesh',
  'navaratri-puja',
];

async function safeTempleSlugs(): Promise<string[]> {
  try {
    const res = await getTemples({ limit: 100 });
    const slugs = res.data.map((t) => t.slug).filter(Boolean);
    return slugs.length > 0 ? slugs : FALLBACK_TEMPLE_SLUGS;
  } catch {
    return FALLBACK_TEMPLE_SLUGS;
  }
}

async function safePujaSlugs(): Promise<string[]> {
  try {
    const res = await getPujaTypes({ limit: 100 });
    const slugs = res.data.map((p) => p.slug).filter(Boolean);
    return slugs.length > 0 ? slugs : FALLBACK_PUJA_SLUGS;
  } catch {
    return FALLBACK_PUJA_SLUGS;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const topLevelStatic: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/temples', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/pujas', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/content', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/darshan', priority: 1.0, changeFrequency: 'daily' },
    { path: '/store', priority: 1.0, changeFrequency: 'weekly' },
  ];

  const secondaryStatic: { path: string; priority: number }[] = [
    { path: '/astrology', priority: 0.7 },
    { path: '/astrology/horoscope', priority: 0.7 },
    { path: '/astrology/kundli', priority: 0.7 },
    { path: '/wellness', priority: 0.7 },
    { path: '/gaushala', priority: 0.7 },
    { path: '/yatra', priority: 0.7 },
    { path: '/yatra/companion', priority: 0.6 },
    { path: '/yatra/plan', priority: 0.6 },
    { path: '/panchang', priority: 0.7 },
    { path: '/weddings', priority: 0.9 },
    { path: '/weddings/muhurat', priority: 0.8 },
    { path: '/weddings/packages', priority: 0.8 },
    { path: '/weddings/inquiry', priority: 0.6 },
    { path: '/blog', priority: 0.7 },
    { path: '/about', priority: 0.5 },
    { path: '/contact', priority: 0.5 },
    { path: '/careers', priority: 0.4 },
    { path: '/help', priority: 0.5 },
    { path: '/pricing', priority: 0.5 },
    { path: '/refunds', priority: 0.5 },
    { path: '/shipping', priority: 0.5 },
    { path: '/privacy', priority: 0.5 },
    { path: '/terms', priority: 0.5 },
    { path: '/list-temple', priority: 0.5 },
    { path: '/become-priest', priority: 0.5 },
    { path: '/become-astrologer', priority: 0.5 },
    { path: '/become-wellness', priority: 0.5 },
    { path: '/list-gaushala', priority: 0.5 },
    // Knowledge + gurukul (Layer M)
    { path: '/sanskrit', priority: 0.8 },
    { path: '/ved', priority: 0.8 },
    { path: '/sanatan', priority: 0.8 },
    { path: '/learn-sanskrit', priority: 0.8 },
    { path: '/gurukuls', priority: 0.9 },
    { path: '/become-gurukul', priority: 0.6 },
    // Conversion + revenue surfaces
    { path: '/donations', priority: 0.8 },
    { path: '/ask-pandit', priority: 0.8 },
    { path: '/nri', priority: 0.9 },
    { path: '/upgrade', priority: 0.7 },
    { path: '/waitlist', priority: 0.6 },
    // Support
    { path: '/support', priority: 0.5 },
    { path: '/support/faq', priority: 0.5 },
    { path: '/credits', priority: 0.3 },
    { path: '/refer', priority: 0.7 },
    { path: '/shloka-card', priority: 0.7 },
    { path: '/launch', priority: 0.6 },
    { path: '/updates', priority: 0.5 },
    { path: '/changelog', priority: 0.5 },
    { path: '/press', priority: 0.5 },
    { path: '/deity', priority: 0.8 },
    { path: '/festival', priority: 0.9 },
    { path: '/city', priority: 0.9 },
    { path: '/aarti', priority: 0.8 },
    { path: '/chalisa', priority: 0.8 },
    { path: '/today', priority: 0.9 },
    { path: '/gift', priority: 0.95 },
    { path: '/pilgrimage', priority: 0.9 },
    { path: '/faqs', priority: 0.8 },
    { path: '/nakshatra', priority: 0.85 },
    { path: '/muhurat', priority: 0.85 },
    { path: '/feed.xml', priority: 0.3 },
  ];

  const bookSlugs = ['bhagavad-gita', 'ramayana', 'upanishads'];

  const yatraSlugs = [
    'char-dham', 'do-dham', 'jyotirlinga-yatra', 'four-dhams-india',
    'amarnath', 'vaishno-devi', 'shirdi-sai', 'tirupati-south', 'ayodhya-kashi',
  ];

  const [templeSlugs, pujaSlugs] = await Promise.all([
    safeTempleSlugs(),
    safePujaSlugs(),
  ]);

  const topLevelEntries = topLevelStatic.map((s) => ({
    url: `${BASE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  const secondaryEntries = secondaryStatic.map((s) => ({
    url: `${BASE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: s.priority,
  }));

  const templeEntries = templeSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/temples/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Programmatic-SEO long-tail page per temple.
    {
      url: `${BASE_URL}/temples/${slug}/pujas`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  const pujaEntries = pujaSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/pujas/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Programmatic-SEO mirror — "where to book {puja}" long-tail.
    {
      url: `${BASE_URL}/pujas/${slug}/temples`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  const yatraEntries = yatraSlugs.map((slug) => ({
    url: `${BASE_URL}/yatra/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // New yatra destination landing pages (Layer M1) — affiliate revenue.
  const { destinationSlugs } = await import('../lib/yatra-destinations');
  const yatraDestEntries = destinationSlugs().map((slug) => ({
    url: `${BASE_URL}/yatra/destinations/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Deity programmatic-SEO pages — long-tail "{deity} puja online".
  const { deitySlugs } = await import('../lib/deities');
  const deityEntries = deitySlugs().map((slug) => ({
    url: `${BASE_URL}/deity/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Per-deity mantra sub-pages — long-tail "{deity} mantras", "{deity} beej mantra".
  const { deitiesWithMantras } = await import('../lib/deity-mantras');
  const deityMantraEntries = deitiesWithMantras().map((slug) => ({
    url: `${BASE_URL}/deity/${slug}/mantras`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Aarti collection — long-tail "{deity} aarti lyrics".
  const { aartiSlugs } = await import('../lib/aartis');
  const aartiEntries = aartiSlugs().map((slug) => ({
    url: `${BASE_URL}/aarti/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Chalisa collection — long-tail "{deity} chalisa lyrics meaning".
  const { chalisaSlugs } = await import('../lib/chalisas');
  const chalisaEntries = chalisaSlugs().map((slug) => ({
    url: `${BASE_URL}/chalisa/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Festival pages — drive massive seasonal traffic spikes.
  const { festivalSlugs } = await import('../lib/festivals');
  const festivalEntries = festivalSlugs().map((slug) => ({
    url: `${BASE_URL}/festival/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // City pages — long-tail "puja in {city}", "temples in {city}".
  const { citySlugs } = await import('../lib/cities');
  const cityEntries = citySlugs().map((slug) => ({
    url: `${BASE_URL}/city/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Per-rashi horoscope pages — long-tail "{rashi} horoscope today".
  const { rashiSlugs } = await import('../lib/rashis');
  const rashiEntries = rashiSlugs().map((slug) => ({
    url: `${BASE_URL}/astrology/horoscope/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Blog posts — pulled from GH at build/revalidate, tolerant of API failure.
  let blogEntries: { url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }[] = [];
  try {
    const { listBlogPosts } = await import('../lib/blog-posts');
    const posts = await listBlogPosts();
    blogEntries = posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    blogEntries = [];
  }

  // Lang landing pages — only landing is genuinely translated per lang.
  // Listing untranslated /lang/* pages would mislead Google + hurt SEO
  // (thin/duplicate content penalty). Expand only when real translated
  // sub-pages ship.
  const { circuitSlugs } = await import('../lib/pilgrimage-circuits');
  const pilgrimageEntries = circuitSlugs().map((slug) => ({
    url: `${BASE_URL}/pilgrimage/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const { nakshatraSlugs } = await import('../lib/nakshatras');
  const nakshatraEntries = nakshatraSlugs().map((slug) => ({
    url: `${BASE_URL}/nakshatra/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const { muhuratSlugs } = await import('../lib/muhurats');
  const muhuratEntries = muhuratSlugs().map((slug) => ({
    url: `${BASE_URL}/muhurat/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const langCodes = ['hi', 'ta', 'te', 'bn', 'mr'] as const;
  const langAlternates = {
    en: `${BASE_URL}/`,
    hi: `${BASE_URL}/hi`,
    ta: `${BASE_URL}/ta`,
    te: `${BASE_URL}/te`,
    bn: `${BASE_URL}/bn`,
    mr: `${BASE_URL}/mr`,
  };
  const langEntries = langCodes.map((code) => ({
    url: `${BASE_URL}/${code}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    alternates: { languages: langAlternates },
  }));

  const bookEntries = [
    { url: `${BASE_URL}/content/books`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...bookSlugs.map((slug) => ({
      url: `${BASE_URL}/content/books/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  const shlokaEntries = [
    { url: `${BASE_URL}/shlokas`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...SHLOKAS.map((s) => ({
      url: `${BASE_URL}/shlokas/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  return [
    ...topLevelEntries,
    ...secondaryEntries,
    ...templeEntries,
    ...pujaEntries,
    ...yatraEntries,
    ...yatraDestEntries,
    ...deityEntries,
    ...deityMantraEntries,
    ...aartiEntries,
    ...chalisaEntries,
    ...festivalEntries,
    ...cityEntries,
    ...rashiEntries,
    ...blogEntries,
    ...bookEntries,
    ...pilgrimageEntries,
    ...nakshatraEntries,
    ...muhuratEntries,
    ...langEntries,
    ...shlokaEntries,
    { url: `${BASE_URL}/yatra/destinations`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  ];
}
