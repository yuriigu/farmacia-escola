import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.routes';
import { medicineRoutes } from './routes/medicine.routes';
import { batchRoutes } from './routes/batch.routes';
import { withdrawalRoutes } from './routes/withdrawal.routes';
import { disposalRoutes } from './routes/disposal.routes';
import { appointmentRoutes } from './routes/appointment.routes';
import { patientRoutes } from './routes/patient.routes';
import { userRoutes } from './routes/user.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida pelo CORS.'));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  return res.json({ status: 'OK', message: 'Servidor Farmácia Escola está rodando!' });
});

// Rotas
app.use('/auth', authRoutes);
app.use('/medicines', medicineRoutes);
app.use('/batches', batchRoutes);
app.use('/withdrawals', withdrawalRoutes);
app.use('/disposals', disposalRoutes);
app.use('/appointments', appointmentRoutes); // Nova rota de agendamentos
app.use('/patients', patientRoutes); // CRUD de pacientes
app.use('/users', userRoutes); // CRUD de usuários (ADMIN)

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`);
});