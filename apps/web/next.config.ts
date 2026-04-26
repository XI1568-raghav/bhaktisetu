import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Cloudflare next-on-pages dev platform — hooks up Cloudflare bindings in `next dev`.
// Only run in development so production builds stay lean.
if (process.env.NODE_ENV === 'development') {
  void (async () => {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
    await setupDevPlatform();
  })();
}

const nextConfig: NextConfig = {
  transpilePackages: ['@poojly/ui', '@poojly/shared', '@poojly/analytics'],
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
    optimizePackageImports: ['lucide-react', 'date-fns', '@tanstack/react-query', 'lodash'],
    webpackBuildWorker: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  async headers() {
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
    ];
  },
};

// Sentry plugin wraps the config only when running outside Cloudflare
// Pages. The wrapper injects code into every page bundle, which trips
// @cloudflare/next-on-pages "duplicated identifier" detection during
// the Vercel-build → Cloudflare adaptation step. The browser-side SDK
// is initialised through instrumentation-client.ts on every page anyway,
// so we don't lose runtime monitoring — only the build-time source map
// upload + automatic route instrumentation, which we don't need yet.
//
// Detection: CF Pages sets CF_PAGES=1 in the build env. Locally and on
// other hosts (Vercel, Render, etc.) the wrapper still runs.
const isCloudflarePagesBuild = process.env.CF_PAGES === '1';

export default isCloudflarePagesBuild
  ? nextConfig
  : withSentryConfig(nextConfig, {
      silent: true,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      errorHandler: (err) => {
        console.warn('[sentry] source map upload skipped:', err.message);
      },
    });
