import type { MetadataRoute } from 'next';

const BASE_URL = 'https://darshya.online';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

// Fetch tolerant of failures — if the API is asleep/cold during build,
// we still ship a sitemap with the static paths rather than crash the
// build or produce a malformed file.
async function fetchSlugs(path: string, key: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}${path}?limit=200`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const items = json[key];
    if (!Array.isArray(items)) return [];
    return items
      .map((i: any) => (typeof i?.slug === 'string' ? i.slug : null))
      .filter((s: string | null): s is string => !!s);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPaths = [
    '',
    '/temples',
    '/pujas',
    '/pujas/home-puja',
    '/pujas/marriage',
    '/astrology',
    '/astrology/horoscope',
    '/astrology/kundli',
    '/wellness',
    '/gaushala',
    '/store',
    '/darshan',
    '/yatra',
    '/yatra/companion',
    '/yatra/plan',
    '/panchang',
    '/content',
    '/blog',
    '/about',
    '/contact',
    '/careers',
    '/help',
    '/pricing',
    '/refunds',
    '/privacy',
    '/terms',
    '/auth/login',
    '/auth/signup',
    '/waitlist',
    '/waitlist/welcome',
  ];

  const [templeSlugs, pujaSlugs] = await Promise.all([
    fetchSlugs('/api/v1/temples', 'temples'),
    fetchSlugs('/api/v1/pujas', 'pujas'),
  ]);

  const staticEntries = staticPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1.0 : path.startsWith('/auth') ? 0.3 : 0.7,
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

  return [...staticEntries, ...templeEntries, ...pujaEntries];
}
