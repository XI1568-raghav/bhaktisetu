import type { MetadataRoute } from 'next';

const BASE_URL = 'https://darshya.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/temple-portal/',
          '/priest/',
          '/store-admin/',
          '/wellness-portal/',
          '/gaushala-portal/',
          '/astrologer-portal/',
          '/auth/callback',
          '/auth/verify',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
