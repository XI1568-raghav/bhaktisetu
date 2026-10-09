import type { MetadataRoute } from 'next';

const BASE_URL = 'https://darshya.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/search',
          '/account/',
          '/settings/',
          '/checkout/',
          '/onboarding/',
          '/consultation/',
          '/provider/',
          '/mobile/',
          '/status',
          '/auth/',
          // '/_next/' must NEVER be disallowed: every stylesheet, script and
          // font the site serves lives under /_next/static/, so blocking it
          // makes Googlebot render every page unstyled and unhydrated
          // (prod sweep 2026-08-12, SEO-02). If RSC/data payloads ever need
          // excluding, disallow the narrow path only — never /_next/static/.
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
  };
}
