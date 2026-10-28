import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
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
