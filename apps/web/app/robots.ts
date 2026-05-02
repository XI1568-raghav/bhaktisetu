import type { MetadataRoute } from 'next';

const BASE_URL = 'https://darshya.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/temples/',
          '/pujas/',
          '/content/',
          '/store/',
          '/darshan/',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/sign-in',
          '/auth/',
          '/_next/',
          '/temple-portal/',
          '/priest/',
          '/store-admin/',
          '/wellness-portal/',
          '/gaushala-portal/',
          '/astrologer-portal/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
