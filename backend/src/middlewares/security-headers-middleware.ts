import { Request, Response, NextFunction } from 'express';

// cabecalhos de seguranca http. faz o papel de um helmet da vida,
// porem sem dependencia externa, so com setHeader mesmo.
// a api so devolve json, entao a politica de conteudo abaixo
// nega qualquer coisa ativa (script, frame, objeto) mesmo em caso
// de mime sniffing ou de alguem navegar direto pra um endpoint.
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

// um ano em segundos, seguindo a recomendacao da owasp pra hsts.
const HSTS_MAX_AGE = 31536000;

// middleware que aplica os cabecalhos de seguranca em toda resposta.
// registrado globalmente no app, antes das rotas, pra garantir que
// ate respostas de erro saiam com as protecoes.
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // tira o header que revela que o servidor roda express,
  // evitando entregar pista da stack pra quem quiser sondar.
  res.removeHeader('X-Powered-By');

  // impede que o browser tente adivinhar o tipo do conteudo
  // e acabe executando algo que nao deveria.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // trava a api de ser embutida em iframe, evitando clickjacking.
  res.setHeader('X-Frame-Options', 'DENY');

  // politica de conteudo especifica pra api, negando tudo.
  res.setHeader('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);

  // nao deixa vazar a url de origem pra destinos externos.
  res.setHeader('Referrer-Policy', 'no-referrer');

  // desliga apis de browser que a api nao usa,
  // reduzindo superficie de ataque caso algo escape pro front.
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  // bloqueia politicas cross-domain legadas (flash/pdf).
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // hsts so faz sentido em https. em dev via http isso travaria o acesso,
  // entao so ligamos quando o ambiente for producao.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', `max-age=${HSTS_MAX_AGE}; includeSubDomains`);
  }

  next();
}