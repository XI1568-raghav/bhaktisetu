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

// Sentry plugin — bundles the client config, uploads source maps when
// SENTRY_AUTH_TOKEN is set, and adds the global error handler. No-op at
// runtime if NEXT_PUBLIC_SENTRY_DSN is unset, so dev builds stay lean.
export default withSentryConfig(nextConfig, {
  // Suppress noisy build-time logs unless we actually want them.
  silent: true,
  // Only upload source maps in production, and only if a Sentry auth
  // token is present. CF Pages env doesn't set this by default, so this
  // gracefully degrades to "no source map upload" — runtime errors are
  // still captured, just with minified stack traces.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Don't fail the build if upload is impossible.
  errorHandler: (err) => {
    console.warn('[sentry] source map upload skipped:', err.message);
  },
});
