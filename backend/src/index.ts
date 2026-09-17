import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';
import { errorMiddleware } from './middlewares/error-middleware';
import { securityHeaders } from './middlewares/security-headers-middleware';

dotenv.config();

const app = express();

// NAO EXPOE O CABECALHO X-Powered-By (FINGERPRINTING DE TECNOLOGIA)
app.disable('x-powered-by');

// CABECALHOS DE SEGURANCA HTTP APLICADOS ANTES DE QUALQUER RESPOSTA,
// INCLUSIVE EM ERROS DE CORS E EM REQUISICOES PREFLIGHT.
app.use(securityHeaders);

let PORT = 3001;
if (process.env.PORT) {
  PORT = Number(process.env.PORT);
} else {
  PORT = 3001;
}

let frontendUrl = 'http://localhost:3000';
if (process.env.FRONTEND_URL) {
  frontendUrl = process.env.FRONTEND_URL;
} else {
  frontendUrl = 'http://localhost:3000';
}
const allowedOrigins = frontendUrl.split(',');

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

// LIMITE EXPLICITO DE PAYLOAD PARA EVITAR CONSUMO EXCESSIVO DE MEMORIA
app.use(express.json({ limit: '100kb' }));

// OTIMIZADO: compressão gzip das respostas JSON (listas de agendamentos,
// medicamentos e lotes caem ~70-80% em bytes transferidos).
app.use(compression());

app.use('/api', apiRoutes);

;

app.use(errorMiddleware);

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