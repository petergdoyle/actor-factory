import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8082/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:8082/health',
      },
    ];
  },
};

export default nextConfig;
