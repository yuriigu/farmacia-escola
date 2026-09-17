import type { NextConfig } from "next";

// CABECALHOS DE SEGURANCA HTTP APLICADOS A TODAS AS RESPOSTAS DO FRONTEND.
// CSP RESTRITIVA: BLOQUEIA SCRIPTS/FRAMES EXTERNOS E MITIGA XSS/CLICKJACKING.
function buildContentSecurityPolicy(): string {
  // FAIL-SAFE: APENAS O MODO `development` EXPLICITO RECEBE A POLITICA PERMISSIVA.
  // QUALQUER OUTRO CENARIO (BUILD DE PRODUCAO, `next start`, NODE_ENV AUSENTE)
  // RECEBE A POLITICA ESTRITA, EVITANDO DEPLOY ACIDENTAL COM CSP FRACA.
  const isDevelopment = process.env.NODE_ENV === 'development';

  // ORIGENS PERMITIDAS PARA CONEXOES FETCH/XHR (API BACKEND)
  const connectSrc = ["'self'"];
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      connectSrc.push(new URL(process.env.NEXT_PUBLIC_API_URL).origin);
    } catch {
      // URL INVALIDA: MANTEM APENAS 'self'
    }
  }

  // O NEXT.JS INJETA SCRIPTS INLINE PARA HIDRATACAO; EM DESENVOLVIMENTO
  // TAMBEM USA eval PARA HOT RELOAD (POR ISSO 'unsafe-eval' FICA RESTRITO AO DEV).
  const scriptSrc = ["'self'", "'unsafe-inline'"];

  const directives = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isDevelopment) {
    // DESENVOLVIMENTO: HOT RELOAD USA eval + websockets EM http/ws LOCAL
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push('ws:', 'http:', 'https:');
    directives.push(`script-src ${scriptSrc.join(' ')}`);
    directives.push(`connect-src ${connectSrc.join(' ')}`);
  } else {
    // PRODUCAO: FORCA HTTPS E NAO PERMITE ORIGENS HTTP NO script-src
    directives.push(`script-src ${scriptSrc.join(' ')}`);
    directives.push(`connect-src ${connectSrc.join(' ')}`);
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

// UM ANO EM SEGUNDOS (RECOMENDACAO OWASP PARA HSTS)
const HSTS_MAX_AGE = 31536000;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
];

// HSTS SOMENTE FORA DO MODO DEVELOPMENT (EM DEV O ACESSO E VIA HTTP)
if (process.env.NODE_ENV !== 'development') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: `max-age=${HSTS_MAX_AGE}; includeSubDomains`,
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  // NAO EXPOE O CABECALHO X-Powered-By (FINGERPRINTING DE TECNOLOGIA)
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
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