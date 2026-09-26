import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';
import { errorMiddleware } from './middlewares/error-middleware';
import { securityHeaders } from './middlewares/security-headers-middleware';

// carrega variaveis de ambiente do .env antes de qualquer coisa,
// porque porta, secret e url do front sao lidos logo abaixo.
dotenv.config();

const app = express();

// desabilita o cabecalho x-powered-by. ele revela que o servidor roda
// express e da pista da stack pra quem quiser sondar.
app.disable('x-powered-by');

// aplica os cabecalhos de seguranca antes de tudo. assim ate respostas
// de erro de cors e requisicoes preflight saem com as protecoes.
app.use(securityHeaders);

// porta da api. padrao 3001, sobrescrita por port quando configurada.
let PORT = 3001;
if (process.env.PORT) {
  PORT = Number(process.env.PORT);
} else {
  PORT = 3001;
}

// url(s) do front permitidas no cors. aceita lista separada por virgula
// em frontend_url pra cobrir dev, homologacao e prod de uma vez.
let frontendUrl = 'http://localhost:3000';
if (process.env.FRONTEND_URL) {
  frontendUrl = process.env.FRONTEND_URL;
} else {
  frontendUrl = 'http://localhost:3000';
}
const allowedOrigins = frontendUrl.split(',');

// configuracao do cors. a checagem de origem passa em tres casos:
// - sem origin (requisicoes de mesmo host, curl, mobile, server-to-server)
// - origin na lista permitida (frontend_url)
// - ambiente de desenvolvimento (pra facilitar o dia a dia)
// qualquer outra origem cai num erro 403 tratado pelo middleware global.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    } else {
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
    }
    const corsError: any = new Error('Origem não permitida pelo CORS');
    corsError.statusCode = 403;
    callback(corsError);
    return;
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// limite explicito de payload pra evitar consumo excessivo de memoria
// e como defesa basica contra abuso no body parser.
app.use(express.json({ limit: '100kb' }));

// comprime as respostas (gzip). ajuda bastante nas listagens grandes,
// como agenda, medicamentos e lotes, reduzindo o trafego.
app.use(compression());

// monta todas as rotas da api sob o prefixo /api.
app.use('/api', apiRoutes);

// middleware global de erro. fica por ultimo pra capturar qualquer
// erro que escapar das rotas e normalizar a resposta.
app.use(errorMiddleware);

// em ambiente de teste, nao subimos o servidor de verdade, pra o
// supertest (ou similar) poder controlar o ciclo de vida. em qualquer
// outro ambiente, sobe normal na porta configurada.
let isTesting = false;
if (process.env.NODE_ENV === 'test') {
  isTesting = true;
} else {
  isTesting = false;
}

if (!isTesting) {
  app.listen(PORT, () => {
    console.log(`[API] Servidor Express iniciado em http://localhost:${PORT}`);
  });
}

export default app;