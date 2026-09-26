import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockStatusService } from '../../../src/services/stock-status-service';
import { StockStatus, DosageUnit } from '../../../src/types/enums';
import { dosageSchema, medicineCreateSchema } from '../../../src/middlewares/validation-middleware';
import { AppointmentService } from '../../../src/services/appointment-service';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { ScheduleSlotRepository } from '../../../src/repositories/schedule-slot-repository';
import { prisma } from '../../../src/utils/prisma';

// mockamos todos os repositorios usados pelos services e o
// activity-log-service. os testes aqui cobrem tres regras de negocio
// farmaceuticas especificas:
// - regra 5: padronizacao de schema zod e dosagens
// - regra 3: calculo dinamico de status de estoque
// - regra 2: reserva de estoque no agendamento (anti-overbooking)
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/repositories/appointment-repository');
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

// suite de testes das regras de negocio farmaceuticas estritas.
// a ideia e validar comportamento de dominio (dosagem, status de
// estoque, reserva de estoque) sem depender de banco nem de controller.
describe('Regras de Negócio Farmacêuticas Estritas', () => {
  describe('Regra 5: Padronização de Schemas Zod e Dosagens Farmacêuticas', () => {
    // o dosageSchema aceita varios formatos de string: com ou sem
    // espaco entre valor e unidade, em maiuscula ou minuscula. todas
    // as amostras abaixo precisam passar.
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

    // alem da string, o schema tambem aceita objeto { value, unit }.
    // o teste confirma a normalizacao: o parse transforma pra string
    // no formato "valor unidade" em maiuscula.
    it('deve aceitar dosagem informada como objeto { value, unit }', () => {
      const result = dosageSchema.safeParse({ value: 500, unit: DosageUnit.MG });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('500 MG');
      }
    });

    // unidades nao farmaceuticas (kg, l, comprimidos) ou strings
    // vazias/invalidas precisam ser rejeitadas.
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

    // valida que o schema de criacao de medicamento tambem usa o
    // dosageSchema estrito. entao uma dosagem invalida derruba o
    // create antes de bater no service.
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

    // saldo zero num lote ainda valido: status out_of_stock.
    it('deve retornar OUT_OF_STOCK quando saldo é zero', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const status = stockStatusService.calculateBatchStatus(0, futureDate);
      expect(status).toBe(StockStatus.OUT_OF_STOCK);
    });

    // validade ja passou: status expired, mesmo com saldo positivo.
    it('deve retornar EXPIRED quando data de validade já passou', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const status = stockStatusService.calculateBatchStatus(50, pastDate);
      expect(status).toBe(StockStatus.EXPIRED);
    });

    // vence em 30 dias ou menos: status critical_expiration.
    it('deve retornar CRITICAL_EXPIRATION quando vence em 30 dias ou menos', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      const status = stockStatusService.calculateBatchStatus(50, soonDate);
      expect(status).toBe(StockStatus.CRITICAL_EXPIRATION);
    });

    // saldo positivo e validade longa: in_stock.
    it('deve retornar IN_STOCK quando saldo positivo e validade superior a 30 dias', () => {
      const safeDate = new Date();
      safeDate.setDate(safeDate.getDate() + 120);
      const status = stockStatusService.calculateBatchStatus(50, safeDate);
      expect(status).toBe(StockStatus.IN_STOCK);
    });

    // teste do status consolidado do medicamento: soma so os lotes
    // validos (exclui vencidos), mantem a contagem total de lotes e
    // classifica o medicamento priorizando critical_expiration sobre
    // in_stock quando existe algum lote em alerta.
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
      // lotes expirados sao desconsiderados do saldo disponivel
      expect(summary.totalQuantity).toBe(30);
      expect(summary.batchesCount).toBe(3);
      // como possui lote em alerta de 20 dias, status deve ser critical_expiration
      expect(summary.status).toBe(StockStatus.CRITICAL_EXPIRATION);
    });
  });

  describe('Regra 2: Reserva de Estoque no Agendamento (Anti-Overbooking)', () => {
    let appointmentService: AppointmentService;
    let mockMedicineRepo: any;
    let mockAppRepo: any;

    beforeEach(() => {
      // limpa contadores e remonta os mocks entre os testes deste bloco.
      vi.clearAllMocks();
      mockMedicineRepo = {
        findById: vi.fn(),
      };
      mockAppRepo = {
        create: vi.fn(),
      };

      // injeta os mocks nos construtores dos repositorios que o
      // appointment-service instancia.
      (MedicineRepository as any).mockImplementation(function () {
        return mockMedicineRepo;
      });
      (AppointmentRepository as any).mockImplementation(function () {
        return mockAppRepo;
      });
      // slot default valido, ativo e na data esperada pelos testes.
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
      // aqui a gente mocka direto o prisma porque o service usa
      // count (agendamentos por slot) e aggregate/findmany (reservas
      // e lotes) pra calcular o saldo real.
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

    // confirma a formula do saldo real: fisico total - reservado
    // pendente. usa lotes validos pra compor o fisico e itens de
    // agendamentos pending pra compor o reservado.
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

      // simula agendamentos pendentes reservando 40 unidades.
      (prisma as any).appointmentItem.findMany.mockResolvedValue([
        { quantity: 25 },
        { quantity: 15 },
      ]);

      const stock = await appointmentService.calculateRealAvailableStock(1);

      expect(stock.physicalStockTotal).toBe(100);
      expect(stock.reservedQuantity).toBe(40);
      expect(stock.realAvailableStock).toBe(60);
    });

    // verifica o bloqueio do overbooking: com 40 reservados em 50
    // fisicos, o disponivel real e 10, entao pedir 15 tem que dar 400
    // com mensagem contendo "estoque insuficiente".
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

      // reservados 40, disponivel real = 10
      (prisma as any).appointmentItem.findMany.mockResolvedValue([
        { quantity: 40 },
      ]);

      // paciente solicita 15 (disponivel real e apenas 10)
      await expect(
        appointmentService.create(
          { userId: 1, role: 'ADMIN' as string },
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

    // caminho feliz do anti-overbooking: com 30 reservados em 50
    // fisicos, o disponivel real e 20, entao pedir 10 passa e o
    // create do repo e chamado.
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

      // paciente solicita 10 (disponivel real e 20)
      const appt = await appointmentService.create(
        { userId: 1, role: 'ADMIN' as string },
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