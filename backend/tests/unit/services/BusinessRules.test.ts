import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockStatusService } from '../../../src/services/StockStatusService';
import { StockStatus, DosageUnit } from '../../../src/types/Enums';
import { dosageSchema, medicineCreateSchema } from '../../../src/middlewares/ValidationMiddleware';
import { AppointmentService } from '../../../src/services/AppointmentService';
import { MedicineRepository } from '../../../src/repositories/MedicineRepository';
import { AppointmentRepository } from '../../../src/repositories/AppointmentRepository';
import { ScheduleSlotRepository } from '../../../src/repositories/ScheduleSlotRepository';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { ActivityLogService } from '../../../src/services/ActivityLogService';
import { prisma } from '../../../src/utils/Prisma';

vi.mock('../../../src/repositories/MedicineRepository');
vi.mock('../../../src/repositories/AppointmentRepository');
vi.mock('../../../src/repositories/ScheduleSlotRepository');
vi.mock('../../../src/repositories/PatientRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('Regras de Negócio Farmacêuticas Estritas', () => {
  describe('Regra 5: Padronização de Schemas Zod e Dosagens Farmacêuticas', () => {
    it('deve aceitar dosagens válidas nas unidades MG, ML, G, MCG e UI', () => {
      const validSamples = [
        '500mg',
        '500 MG',
        '10ml',
        '10 ML',
        '1g',
        '2.5 G',
        '50mcg',
        '100 UI',
        '100ui',
      ];

      for (let i = 0; i < validSamples.length; i++) {
        const sample = validSamples[i];
        const result = dosageSchema.safeParse(sample);
        expect(result.success).toBe(true);
      }
    });

    it('deve aceitar dosagem informada como objeto { value, unit }', () => {
      const result = dosageSchema.safeParse({ value: 500, unit: DosageUnit.MG });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('500 MG');
      }
    });

    it('deve rejeitar unidades não farmacêuticas ou inválidas (kg, l, comprimidos, vazio)', () => {
      const invalidSamples = [
        '500kg',
        '10litros',
        '2 caixas',
        '500',
        'xyz',
        '',
      ];

      for (let i = 0; i < invalidSamples.length; i++) {
        const sample = invalidSamples[i];
        const result = dosageSchema.safeParse(sample);
        expect(result.success).toBe(false);
      }
    });

    it('deve validar medicineCreateSchema com a dosagem estrita', () => {
      const validMedicine = {
        name: 'Amoxicilina',
        dosage: '250mg',
      };
      const invalidMedicine = {
        name: 'Amoxicilina',
        dosage: '250kg',
      };

      expect(medicineCreateSchema.safeParse(validMedicine).success).toBe(true);
      expect(medicineCreateSchema.safeParse(invalidMedicine).success).toBe(false);
    });
  });

  describe('Regra 3: Cálculo Dinâmico de Alertas e Status (StockStatusService)', () => {
    let stockStatusService: StockStatusService;

    beforeEach(() => {
      stockStatusService = new StockStatusService();
    });

    it('deve retornar OUT_OF_STOCK quando saldo é zero', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const status = stockStatusService.calculateBatchStatus(0, futureDate);
      expect(status).toBe(StockStatus.OUT_OF_STOCK);
    });

    it('deve retornar EXPIRED quando data de validade já passou', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const status = stockStatusService.calculateBatchStatus(50, pastDate);
      expect(status).toBe(StockStatus.EXPIRED);
    });

    it('deve retornar CRITICAL_EXPIRATION quando vence em 30 dias ou menos', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      const status = stockStatusService.calculateBatchStatus(50, soonDate);
      expect(status).toBe(StockStatus.CRITICAL_EXPIRATION);
    });

    it('deve retornar IN_STOCK quando saldo positivo e validade superior a 30 dias', () => {
      const safeDate = new Date();
      safeDate.setDate(safeDate.getDate() + 120);
      const status = stockStatusService.calculateBatchStatus(50, safeDate);
      expect(status).toBe(StockStatus.IN_STOCK);
    });

    it('deve calcular status consolidado do medicamento considerando lotes ativos', () => {
      const futureSafe = new Date();
      futureSafe.setDate(futureSafe.getDate() + 90);

      const futureCritical = new Date();
      futureCritical.setDate(futureCritical.getDate() + 20);

      const pastExpired = new Date();
      pastExpired.setDate(pastExpired.getDate() - 10);

      const batches = [
        { currentQuantity: 20, expirationDate: futureSafe },
        { currentQuantity: 10, expirationDate: futureCritical },
        { currentQuantity: 50, expirationDate: pastExpired },
      ];

      const summary = stockStatusService.calculateMedicineStock(batches);
      // Lotes expirados são desconsiderados do saldo disponível
      expect(summary.totalQuantity).toBe(30);
      expect(summary.batchesCount).toBe(3);
      // Como possui lote em alerta de 20 dias, status deve ser CRITICAL_EXPIRATION
      expect(summary.status).toBe(StockStatus.CRITICAL_EXPIRATION);
    });
  });

  describe('Regra 2: Reserva de Estoque no Agendamento (Anti-Overbooking)', () => {
    let appointmentService: AppointmentService;
    let mockMedicineRepo: any;
    let mockAppRepo: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockMedicineRepo = {
        findById: vi.fn(),
      };
      mockAppRepo = {
        create: vi.fn(),
      };

      (MedicineRepository as any).mockImplementation(function () {
        return mockMedicineRepo;
      });
      (AppointmentRepository as any).mockImplementation(function () {
        return mockAppRepo;
      });
      (ScheduleSlotRepository as any).mockImplementation(function () {
        return {
          findById: vi.fn().mockResolvedValue({
            id: 1,
            date: new Date('2026-10-15T00:00:00.000Z'),
            maxCapacity: 5,
            active: true,
            appointments: [],
          }),
        };
      });
      (prisma as any).appointment = {
        count: vi.fn().mockResolvedValue(0),
      };

      (prisma as any).appointmentItem = {
        findMany: vi.fn().mockResolvedValue([]),
      };
      (prisma as any).stockBatch = {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      };

      appointmentService = new AppointmentService();
    });

    it('deve calcular disponibilidade real = Físico Total - Reservado Pendente', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      mockMedicineRepo.findById.mockResolvedValue({
        id: 1,
        name: 'Dipirona 500mg',
        batches: [
          { currentQuantity: 100, expirationDate: futureDate },
        ],
      });

      // Simula agendamentos pendentes reservando 40 unidades
      (prisma as any).appointmentItem.findMany.mockResolvedValue([
        { quantity: 25 },
        { quantity: 15 },
      ]);

      const stock = await appointmentService.calculateRealAvailableStock(1);

      expect(stock.physicalStockTotal).toBe(100);
      expect(stock.reservedQuantity).toBe(40);
      expect(stock.realAvailableStock).toBe(60);
    });

    it('deve bloquear agendamento quando quantidade solicitada excede a disponibilidade real', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      mockMedicineRepo.findById.mockResolvedValue({
        id: 1,
        name: 'Dipirona 500mg',
        batches: [
          { currentQuantity: 50, expirationDate: futureDate },
        ],
      });

      // Reservados 40, disponível real = 10
      (prisma as any).appointmentItem.findMany.mockResolvedValue([
        { quantity: 40 },
      ]);

      // Paciente solicita 15 (disponível real é apenas 10)
      await expect(
        appointmentService.create(
          { userId: 1, role: 'ADMIN' },
          {
            patientId: 1,
            scheduledDate: '2026-10-15',
            slotId: 1,
            items: [{ medicineId: 1, quantity: 15 }],
          }
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Estoque insuficiente'),
      });
    });

    it('deve permitir agendamento quando quantidade solicitada respeita a disponibilidade real', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      mockMedicineRepo.findById.mockResolvedValue({
        id: 1,
        name: 'Dipirona 500mg',
        batches: [
          { currentQuantity: 50, expirationDate: futureDate },
        ],
      });

      (prisma as any).appointmentItem.findMany.mockResolvedValue([
        { quantity: 30 },
      ]);

      mockAppRepo.create.mockResolvedValue({
        id: 99,
        patientId: 1,
        status: 'PENDING',
      });

      // Paciente solicita 10 (disponível real é 20)
      const appt = await appointmentService.create(
        { userId: 1, role: 'ADMIN' },
        {
          patientId: 1,
          scheduledDate: '2026-10-15',
          slotId: 1,
          items: [{ medicineId: 1, quantity: 10 }],
        }
      );

      expect(appt).toBeDefined();
      expect(mockAppRepo.create).toHaveBeenCalled();
    });
  });
});
