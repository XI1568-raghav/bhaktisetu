import type { NextConfig } from 'next';

// Cloudflare next-on-pages dev platform — hooks up Cloudflare bindings in `next dev`.
// Only run in development so production builds stay lean.
if (process.env.NODE_ENV === 'development') {
  void (async () => {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
    await setupDevPlatform();
  })();
}

const nextConfig: NextConfig = {
  transpilePackages: ['@poojly/ui', '@poojly/shared', '@poojly/api-client'],
  typescript: {
    // pnpm hoists @types/react@18 (mobile) alongside @types/react@19 (web),
    // and Next 15's webpack-side typechecker resolves to 18 for some files
    // (Suspense / SuspenseProps shape diff). Real type-check still gates CI
    // via `turbo type-check` running on the per-app tsconfigs.
    ignoreBuildErrors: true,
  },
  images: {
    // Cloudflare Pages doesn't support Next's default image optimizer without a custom loader.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '**.archive.org',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  experimental: {
    // TD3 — extended optimize list. These libs are tree-shake friendly under
    // Next 15 modular optimization. Reduces initial JS bundle significantly.
    optimizePackageImports: [
      'lucide-react', 'date-fns', '@tanstack/react-query', 'lodash',
      'react-icons', 'recharts', 'framer-motion', '@radix-ui/react-icons',
    ],
    webpackBuildWorker: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  webpack: (config) => {
    // Workspace packages (@poojly/api-client, @poojly/shared) use NodeNext-style
    // `./foo.js` imports in their TS source. Webpack's default resolver doesn't
    // know to map `.js` → `.ts`. extensionAlias fixes this for bundlers.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  async redirects() {
    // Legacy `/kundli` path. Canonical is `/astrology/kundli`.
    // Permanent redirect preserves SEO + survives external inbound links.
    return [
      {
        source: '/kundli',
        destination: '/astrology/kundli',
        permanent: true,
      },
    ];
  },
  async headers() {
    // TD8 — per-route CDN cache rules. Cloudflare honours s-maxage (CDN-only)
    // and stale-while-revalidate, while max-age controls the browser TTL.
    // Intentionally not enumerated here:
    //   - /api/* — handlers set Cache-Control: private, no-cache themselves.
    //   - HTML pages — fall through to per-route Next revalidate config.
    return [
      {
        // Long-cache static image + font assets served from /public.
        // These paths are versioned implicitly by filename, so immutable is safe.
        source: '/:all*\\.(jpg|jpeg|png|webp|avif|svg|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next build artefacts are content-hashed.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Slug pages are mostly-static. 5min CDN edge, 1d SWR keeps Cloudflare
        // serving while origin regenerates.
        source: '/temples/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/pujas/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/yatra/destinations/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // SEO surfaces — refresh hourly, serve stale for a day.
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

// Browser-side Sentry deferred — even just having @sentry/nextjs in
// dependencies caused Next 15 to auto-bundle @sentry/node + OpenTelemetry
// into every route, which @cloudflare/next-on-pages can't dedupe across
// route bundles ("duplicated identifier" abort). The package was removed
// from apps/web/package.json entirely. Server-side Sentry on the Render
// API (uses @sentry/node directly) is unaffected and still catching
// real bugs.
//
// Future: when browser error capture is wanted, add @sentry/browser as
// a small standalone dep — that package is pure-browser and tree-shakes
// cleanly, no Next plugin involvement.
export default nextConfig;
