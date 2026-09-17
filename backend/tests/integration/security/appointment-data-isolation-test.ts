import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';
import { Role } from '../../../src/types/enums';
import appointmentRoutes from '../../../src/routes/appointment-routes';
import { errorMiddleware } from '../../../src/middlewares/error-middleware';

/**
 * REGRESSAO DE SEGURANCA: Isolamento de agendamentos por paciente.
 *
 * Este teste NAO mocka o controller/service/repository. Mockamos apenas o
 * cliente Prisma mais profundo (src/utils/prisma) para simular um banco com
 * tres pacientes distintos e seus agendamentos. Assim, qualquer falha no filtro
 * `where: { patientId }` faz o teste falhar — o mock devolve TODOS os agendamentos
 * quando a query nao carrega o filtro.
 */
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn(), findFirst: vi.fn() },
    appointment: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

// --- Dados simulados do "banco" ---
// Joao (patientId=1) — 2 agendamentos
// Carlos (patientId=2) — 2 agendamentos
// Maria (patientId=3) — 1 agendamento
const patient1Appointments = [
  { id: 1, patientId: 1, scheduledDate: '2025-10-15T10:00:00.000Z', scheduledTime: '10:00', status: 'PENDING' },
  { id: 2, patientId: 1, scheduledDate: '2025-10-16T11:00:00.000Z', scheduledTime: '11:00', status: 'CONFIRMED' },
];
const patient2Appointments = [
  { id: 3, patientId: 2, scheduledDate: '2025-10-17T14:00:00.000Z', scheduledTime: '14:00', status: 'PENDING' },
  { id: 4, patientId: 2, scheduledDate: '2025-10-18T09:00:00.000Z', scheduledTime: '09:00', status: 'CANCELLED' },
];
const patient3Appointments = [
  { id: 5, patientId: 3, scheduledDate: '2025-10-19T15:00:00.000Z', scheduledTime: '15:00', status: 'COMPLETED' },
];
const allAppointments = [...patient1Appointments, ...patient2Appointments, ...patient3Appointments];

describe('Isolamento de Dados de Agendamentos (PACIENTE)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    // Simula o banco: query com filtro patientId devolve apenas os agendamentos
    // daquele paciente. Sem filtro, devolve TUDO (vazamento se autorizacao omitida).
    (prisma.appointment.findMany as any).mockImplementation(async (args: any) => {
      const where = args?.where;
      if (where && typeof where.patientId === 'number') {
        return allAppointments.filter((a) => a.patientId === where.patientId);
      }
      return allAppointments;
    });

        // Re-deriva o paciente a partir do userId autenticado (defense in depth).
    // Compartilhado entre findFirst (service) e findUnique (controller legacy),
    // para que o teste seja valido tanto na arvore de trabalho quanto no HEAD.
    const patientByUser: Record<number, any> = {
      10: { id: 1, userId: 10, name: 'Joao Silva' },
      20: { id: 2, userId: 20, name: 'Carlos Santos' },
      30: { id: 3, userId: 30, name: 'Maria Oliveira' },
    };
    (prisma.patient.findFirst as any).mockImplementation(async (args: any) => {
      const userId = args?.where?.userId;
      return patientByUser[userId] ?? null;
    });
    (prisma.patient.findUnique as any).mockImplementation(async (args: any) => {
      const userId = args?.where?.userId;
      return patientByUser[userId] ?? null;
    });

    (prisma.appointment.findUnique as any).mockImplementation(async (args: any) => {
      const id = args?.where?.id;
      return allAppointments.find((a) => a.id === id) ?? null;
    });

    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
    app.use(errorMiddleware);
  });

  // Mock de prisma.user.findUnique (realizado pelo authMiddleware).
  // O authMiddleware re-deriva patientId do banco (nao do token) — defense in depth.
  function mockUser(id: number, role: Role, patientId: number | null) {
    (prisma.user.findUnique as any).mockImplementation(async (args: any) => {
      const requestedId = args?.where?.id;
      if (requestedId !== id) return null;
      return {
        id,
        email: `${role.toLowerCase()}-user@farmacia.ufba.br`,
        role: role as string,
        active: true,
        permissions: null,
        patient: patientId ? { id: patientId } : null,
      };
    });
  }


  // =====================================================================
  // LISTAGEM — GET /api/appointments
  // =====================================================================
  describe('GET /api/appointments — listagem', () => {
    it('PACIENTE deve retornar SOMENTE os agendamentos do paciente autenticado (Joao)', async () => {
      mockUser(10, Role.PACIENTE, 1); // Joao

      const token = generateToken({ userId: 10, role: Role.PACIENTE, patientId: 1 });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Joao so deve ver os 2 agendamentos dele (patientId=1)
      expect(res.body).toHaveLength(2);
      expect(res.body.every((a: any) => a.patientId === 1)).toBe(true);
      // Nenhum dado de Carlos (patientId=2) ou Maria (patientId=3) deve vazar
      expect(res.body.some((a: any) => a.patientId === 2)).toBe(false);
      expect(res.body.some((a: any) => a.patientId === 3)).toBe(false);
      // Garante que o filtro chegou ao banco (where.patientId)
      const findManyArgs = (prisma.appointment.findMany as any).mock.calls[0][0];
      expect(findManyArgs.where.patientId).toBe(1);
    });

    it('PACIENTE nao deve ver agendamentos de outro paciente (Carlos)', async () => {
      mockUser(20, Role.PACIENTE, 2); // Carlos

      const token = generateToken({ userId: 20, role: Role.PACIENTE, patientId: 2 });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((a: any) => a.patientId === 2)).toBe(true);
      // Joao e Maria nao devem vazar
      expect(res.body.some((a: any) => a.patientId === 1)).toBe(false);
      expect(res.body.some((a: any) => a.patientId === 3)).toBe(false);
    });
  });


  // =====================================================================
  // ACESSO ADMINISTRATIVO — GET /api/appointments
  // =====================================================================
  describe('GET /api/appointments — acesso administrativo', () => {
    it('ADMIN deve retornar TODOS os agendamentos (sem filtro de patientId)', async () => {
      mockUser(1, Role.ADMIN, null);

      const token = generateToken({ userId: 1, role: Role.ADMIN });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(allAppointments.length);
      // Confirma que NENHUM filtro de patientId foi aplicado
      const findManyArgs = (prisma.appointment.findMany as any).mock.calls[0][0];
      expect(findManyArgs.where.patientId).toBeUndefined();
    });

    it('FARMACEUTICO deve retornar TODOS os agendamentos (sem filtro de patientId)', async () => {
      mockUser(2, Role.FARMACEUTICO, null);

      const token = generateToken({ userId: 2, role: Role.FARMACEUTICO });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(allAppointments.length);
      const findManyArgs = (prisma.appointment.findMany as any).mock.calls[0][0];
      expect(findManyArgs.where.patientId).toBeUndefined();
    });
  });

  // =====================================================================
  // ACESSO POR ID — GET /api/appointments/:id
  // =====================================================================
  describe('GET /api/appointments/:id — isolamento por ID', () => {
    it('PACIENTE deve obter 403 ao tentar acessar agendamento de outro paciente', async () => {
      mockUser(10, Role.PACIENTE, 1); // Joao
      const token = generateToken({ userId: 10, role: Role.PACIENTE, patientId: 1 });

      // id=3 pertence a Carlos (patientId=2)
      const res = await request(app)
        .get('/api/appointments/3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('PACIENTE deve obter seu proprio agendamento (200)', async () => {
      mockUser(10, Role.PACIENTE, 1); // Joao
      const token = generateToken({ userId: 10, role: Role.PACIENTE, patientId: 1 });

      const res = await request(app)
        .get('/api/appointments/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });
  });
});

