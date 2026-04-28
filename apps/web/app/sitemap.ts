import type { MetadataRoute } from 'next';

const BASE_URL = 'https://darshya.online';

export default function sitemap(): MetadataRoute.Sitemap {
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
  ];

  return staticPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : path.startsWith('/auth') ? 0.3 : 0.7,
  }));
}
