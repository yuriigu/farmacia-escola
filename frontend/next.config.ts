import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // Redireciona chamadas /api/* do frontend para o backend Express se estiver rodando localmente
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;