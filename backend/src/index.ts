import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import { errorMiddleware } from './middlewares/ErrorMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração robusta de CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como mobile apps, Postman ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rotas da API
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erros
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`🚀 [API] Servidor Express iniciado em http://localhost:${PORT}`);
});