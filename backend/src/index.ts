import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/Index';
import { errorMiddleware } from './middlewares/ErrorMiddleware';

dotenv.config();

const app = express();

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
    callback(new Error('Origem não permitida pelo CORS'));
    return;
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
  return;
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[API] Servidor Express iniciado em http://localhost:${PORT}`);
});