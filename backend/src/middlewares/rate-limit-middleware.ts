import { Request, Response, NextFunction, RequestHandler } from 'express';

// limitador de taxa em memoria (janela fixa) pra mitigar forca bruta
// e abuso de endpoints sensiveis. a ideia e ser simples e sem
// dependencia externa: cada chave (normalmente ip ou conta) ganha
// um balde com contador e tempo de reset.
export interface RateLimitOptions {
  // tamanho da janela em milissegundos
  windowMs: number;
  // maximo de requisicoes permitidas dentro da janela
  max: number;
  // mensagem devolvida quando o limite e excedido
  message?: string;
  // chave de agrupamento (padrao: ip de origem)
  keyGenerator?: (_req: Request) => string;
  // relogio injetavel, util pra testes deterministicos
  now?: () => number;
}

// estado de cada chave: quantas requisicoes ja fez na janela atual
// e quando essa janela expira (em ms desde epoch).
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// mensagem padrao usada quando o cliente estoura o limite.
// pode ser sobrescrita via options.message em cada limitador.
export const DEFAULT_RATE_LIMIT_MESSAGE = 'Muitas requisições em sequência. Aguarde alguns minutos e tente novamente.';

// fabrica de middleware de rate limit. recebe as opcoes, monta o estado
// interno (buckets) e devolve um RequestHandler pronto pra plugar nas rotas.
// como cada chamada cria seu proprio mapa de buckets, limitadores diferentes
// nao interferem entre si.
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs = options.windowMs;
  const max = options.max;
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now || (() => Date.now());

  // se nao veio mensagem customizada, usamos a padrao.
  let message = DEFAULT_RATE_LIMIT_MESSAGE;
  if (options.message) {
    message = options.message;
  }

  // por padrao agrupamos por ip. quem precisar de outra chave
  // (ex: por email da conta) sobrescreve via options.keyGenerator.
  let keyGenerator = (req: Request): string => {
    return req.ip || 'desconhecido';
  };
  if (options.keyGenerator) {
    keyGenerator = options.keyGenerator;
  }

  // guardamos quando foi a ultima limpeza pra nao varrer os buckets
  // a cada requisicao. assim a faxina roda em intervalos de uma janela.
  let lastSweep = now();

  // remove janelas expiradas pra evitar crescimento indefinido de memoria.
  // se ainda nao passou tempo suficiente desde a ultima limpeza, sai fora.
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

  // esse e o middleware em si. a cada requisicao: limpa se necessario,
  // pega (ou cria) o bucket da chave, reseta se a janela venceu,
  // incrementa o contador, escreve os headers de rate limit e,
  // se estourou o max, devolve 429 com retry-after.
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTime = now();
    sweep(currentTime);

    const key = keyGenerator(req);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(key, bucket);
    } else {
      // se a janela ja venceu, comeca uma nova do zero.
      if (bucket.resetAt <= currentTime) {
        bucket.count = 0;
        bucket.resetAt = currentTime + windowMs;
      }
    }

    bucket.count = bucket.count + 1;
    const remaining = Math.max(0, max - bucket.count);

    // headers padrao pra o cliente saber como esta o limite.
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    // se estourou, responde 429 com retry-after dizendo quantos
    // segundos faltam pra tentar de novo.
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

// em testes automatizados a limitacao e desativada pra nao introduzir
// dependencia de estado global entre casos de teste. esse wrapper
// so deixa passar direto quando NODE_ENV for 'test'.
function skipInTestEnv(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    handler(req, res, next);
  };
}

// 15 minutos de janela para os endpoints de autenticacao.
// ficou como constante pra deixar claro que os dois limitadores abaixo
// compartilham a mesma janela.
const AUTH_WINDOW_MS = 15 * 60 * 1000;

// limite grosso por ip (mitiga flood/dos contra o login).
// 100 tentativas em 15 min por ip, mais que suficiente pra uso normal.
export const authIpRateLimit = skipInTestEnv(createRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  max: 100,
  message: 'Muitas tentativas de autenticação a partir deste endereço. Aguarde alguns minutos e tente novamente.',
}));

// limite estrito por conta (mitiga forca bruta direcionada).
// 10 tentativas em 15 min por email. a chave e o email em minusculo
// pra nao burlar variando maiuscula/minuscula. se nao der pra ler
// o email, cai pro ip como fallback.
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