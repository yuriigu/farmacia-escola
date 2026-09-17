import { Request, Response, NextFunction, RequestHandler } from 'express';

// LIMITADOR DE TAXA EM MEMORIA (JANELA FIXA) PARA MITIGAR FORCA BRUTA
// E ABUSO DE ENDPOINTS SENSIVEIS. NAO REQUER DEPENDENCIA EXTERNA.
export interface RateLimitOptions {
  // TAMANHO DA JANELA EM MILISSEGUNDOS
  windowMs: number;
  // MAXIMO DE REQUISICOES PERMITIDAS DENTRO DA JANELA
  max: number;
  // MENSAGEM DEVOLVIDA QUANDO O LIMITE E EXCEDIDO
  message?: string;
  // CHAVE DE AGRUPAMENTO (PADRAO: IP DE ORIGEM)
  keyGenerator?: (_req: Request) => string;
  // RELOGIO INJETAVEL (FACILITA TESTES DETERMINISTICOS)
  now?: () => number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const DEFAULT_RATE_LIMIT_MESSAGE = 'Muitas requisições em sequência. Aguarde alguns minutos e tente novamente.';

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs = options.windowMs;
  const max = options.max;
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now || (() => Date.now());

  let message = DEFAULT_RATE_LIMIT_MESSAGE;
  if (options.message) {
    message = options.message;
  }

  let keyGenerator = (req: Request): string => {
    return req.ip || 'desconhecido';
  };
  if (options.keyGenerator) {
    keyGenerator = options.keyGenerator;
  }

  let lastSweep = now();

  // REMOVE JANELAS EXPIRADAS PARA EVITAR CRESCIMENTO INDEFINIDO DE MEMORIA
  function sweep(currentTime: number): void {
    if (currentTime - lastSweep < windowMs) {
      return;
    }
    lastSweep = currentTime;
    for (const entry of buckets.entries()) {
      if (entry[1].resetAt <= currentTime) {
        buckets.delete(entry[0]);
      }
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTime = now();
    sweep(currentTime);

    const key = keyGenerator(req);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(key, bucket);
    } else {
      if (bucket.resetAt <= currentTime) {
        bucket.count = 0;
        bucket.resetAt = currentTime + windowMs;
      }
    }

    bucket.count = bucket.count + 1;
    const remaining = Math.max(0, max - bucket.count);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

// EM TESTES AUTOMATIZADOS A LIMITACAO E DESATIVADA PARA NAO INTRODUZIR
// DEPENDENCIA DE ESTADO GLOBAL ENTRE CASOS DE TESTE.
function skipInTestEnv(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    handler(req, res, next);
  };
}

// 15 MINUTOS DE JANELA PARA OS ENDPOINTS DE AUTENTICACAO
const AUTH_WINDOW_MS = 15 * 60 * 1000;

// LIMITE GROSSO POR IP (MITIGA FLOOD/DOS CONTRA O LOGIN)
export const authIpRateLimit = skipInTestEnv(createRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  max: 100,
  message: 'Muitas tentativas de autenticação a partir deste endereço. Aguarde alguns minutos e tente novamente.',
}));

// LIMITE ESTRITO POR CONTA (MITIGA FORCA BRUTA DIRECIONADA)
export const authAccountRateLimit = skipInTestEnv(createRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  max: 10,
  message: 'Muitas tentativas de autenticação para esta conta. Aguarde alguns minutos e tente novamente.',
  keyGenerator: (req: Request): string => {
    let email = '';
    if (req.body) {
      if (typeof req.body.email === 'string') {
        email = req.body.email.trim().toLowerCase();
      }
    }
    if (!email) {
      return `ip:${req.ip || 'desconhecido'}`;
    }
    return `conta:${email}`;
  },
}));
