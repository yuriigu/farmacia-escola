import rateLimit from 'express-rate-limit';

let isTestEnv = false;
if (process.env.NODE_ENV === 'test') {
  isTestEnv = true;
} else {
  isTestEnv = false;
}

let authMax = 10;
if (isTestEnv) {
  authMax = 1000;
} else {
  authMax = 10;
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
  },
});

let apiMax = 300;
if (isTestEnv) {
  apiMax = 5000;
} else {
  apiMax = 300;
}

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.',
  },
});
