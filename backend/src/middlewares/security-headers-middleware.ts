import { Request, Response, NextFunction } from 'express';

// CABECALHOS DE SEGURANCA HTTP (EQUIVALENTE AO HELMET, SEM DEPENDENCIA EXTERNA)
// A API devolve exclusivamente JSON, portanto a politica abaixo nega qualquer
// carregamento de conteudo ativo (scripts, frames, objetos) mesmo em caso de
// MIME sniffing ou de navegacao direta para um endpoint da API.
const API_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'none'",
  "img-src 'none'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

// UM ANO EM SEGUNDOS (RECOMENDACAO OWASP PARA HSTS)
const HSTS_MAX_AGE = 31536000;

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // NAO REVELAR A TECNOLOGIA DO SERVIDOR
  res.removeHeader('X-Powered-By');

  // IMPEDE A INTERPRETACAO DE RESPOSTAS COM MIME TYPE DIVERGENTE
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // IMPEDE QUE A API SEJA EMBUTIDA EM IFRAMES (CLICKJACKING)
  res.setHeader('X-Frame-Options', 'DENY');

  // POLITICA DE SEGURANCA DE CONTEUDO PARA RESPOSTAS DA API
  res.setHeader('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);

  // NAO PROPAGAR A URL DE ORIGEM PARA DESTINOS EXTERNOS
  res.setHeader('Referrer-Policy', 'no-referrer');

  // DESABILITA APIS DE BROWSER NAO UTILIZADAS PELA API
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  // BLOQUEIA POLITICAS DE CROSS-DOMAIN LEGADAS (FLASH/PDF)
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // HSTS SOMENTE SOBRE HTTPS (EM DESENVOLVIMENTO HTTP ISSO BLOQUEARIA O ACESSO)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', `max-age=${HSTS_MAX_AGE}; includeSubDomains`);
  }

  next();
}
