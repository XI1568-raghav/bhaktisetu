import type { MetadataRoute } from 'next';
import { getTemples, getPujaTypes } from '../lib/api';

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
    { path: '/blog', priority: 0.7 },
    { path: '/about', priority: 0.5 },
    { path: '/contact', priority: 0.5 },
    { path: '/careers', priority: 0.4 },
    { path: '/help', priority: 0.5 },
    { path: '/pricing', priority: 0.5 },
    { path: '/refunds', priority: 0.4 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
    { path: '/list-temple', priority: 0.5 },
    { path: '/become-priest', priority: 0.5 },
    { path: '/become-astrologer', priority: 0.5 },
    { path: '/become-wellness', priority: 0.5 },
    { path: '/list-gaushala', priority: 0.5 },
  ];

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

  const templeEntries = templeSlugs.map((slug) => ({
    url: `${BASE_URL}/temples/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const pujaEntries = pujaSlugs.map((slug) => ({
    url: `${BASE_URL}/pujas/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const yatraEntries = yatraSlugs.map((slug) => ({
    url: `${BASE_URL}/yatra/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    ...topLevelEntries,
    ...secondaryEntries,
    ...templeEntries,
    ...pujaEntries,
    ...yatraEntries,
  ];
}
