import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  async redirects() {
    return [
      {
        source: '/travel/expenses',
        destination: '/travel/cashbook',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
