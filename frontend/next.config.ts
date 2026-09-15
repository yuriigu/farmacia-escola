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
      // MAPEAMENTO DE URLs AMIGAVEIS EM PORTUGUES PARA AS PASTAS INTERNAS EM INGLES
      {
        source: '/medicamentos',
        destination: '/medicines',
      },
      {
        source: '/medicamentos/:path*',
        destination: '/medicines/:path*',
      },
      {
        source: '/lotes',
        destination: '/estoque',
      },
      {
        source: '/escalas',
        destination: '/scales',
      },
      {
        source: '/perfil',
        destination: '/profile',
      },
    ];
  },
  async redirects() {
    return [
      // SANITIZACAO DE ROTAS DUPLICADAS/ORFAS: TUDO DE USUARIOS CONVERGE PARA /usuarios
      {
        source: '/admin/stock',
        destination: '/lotes',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/usuarios',
        permanent: false,
      },
      {
        source: '/administracao',
        destination: '/usuarios',
        permanent: false,
      },
      {
        source: '/pacientes',
        destination: '/usuarios',
        permanent: false,
      },
      // DUPLICIDADE DE AGENDAMENTOS: /appointments CONVERGE PARA /agendamentos
      {
        source: '/appointments/new',
        destination: '/agendamentos?new=1',
        permanent: false,
      },
      {
        source: '/appointments',
        destination: '/agendamentos',
        permanent: false,
      },
      // CONFIGURACOES/PERFIL: PADRONIZACAO EM PORTUGUES
      {
        source: '/settings',
        destination: '/configuracoes',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/perfil',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;