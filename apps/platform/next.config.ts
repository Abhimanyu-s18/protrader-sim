import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@protrader/ui'],
  experimental: {
    optimizePackageImports: ['@protrader/ui'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.r2.dev' }],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/symbols',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
