import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bhaktisetu/ui', '@bhaktisetu/shared', '@bhaktisetu/analytics'],
  images: {
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
