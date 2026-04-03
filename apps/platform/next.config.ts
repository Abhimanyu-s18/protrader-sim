import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@protrader/ui'],
  experimental: {
    optimizePackageImports: ['@protrader/ui'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.r2.cloudflarestorage.com' }],
  },
}

export default nextConfig
