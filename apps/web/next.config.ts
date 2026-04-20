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
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
