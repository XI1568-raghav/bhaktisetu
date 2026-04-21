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

export default nextConfig;
