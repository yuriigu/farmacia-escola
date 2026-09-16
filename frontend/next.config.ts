import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/backend/:path*`,
      },
      {
        source: '/api-proxy/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // MAPEAMENTO DE URLs AMIGAVEIS EM PORTUGUES PARA AS PASTAS FISICAS EM INGLES
      {
        source: '/medicamentos',
        destination: '/medicines',
      },
      {
        source: '/lotes',
        destination: '/inventory',
      },
      {
        source: '/estoque',
        destination: '/inventory',
      },
      {
        source: '/descartes',
        destination: '/disposals',
      },
      {
        source: '/agendamentos',
        destination: '/appointments',
      },
      {
        source: '/calendario',
        destination: '/calendar',
      },
      {
        source: '/escalas',
        destination: '/scales',
      },
      {
        source: '/usuarios',
        destination: '/users',
      },
      {
        source: '/administracao',
        destination: '/users',
      },
      {
        source: '/pacientes',
        destination: '/users',
      },
      {
        source: '/configuracoes',
        destination: '/settings',
      },
      {
        source: '/perfil',
        destination: '/profile',
      },
      // MODULO EXPURGADO: RETIRADAS CONVERGE PARA AGENDAMENTOS
      {
        source: '/retiradas',
        destination: '/appointments',
      },
    ];
  },
  async redirects() {
    return [
      // SANITIZACAO DE ROTAS DUPLICADAS/ORFAS
      {
        source: '/admin/stock',
        destination: '/inventory',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/users',
        permanent: false,
      },
      {
        source: '/my-appointments',
        destination: '/appointments',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;