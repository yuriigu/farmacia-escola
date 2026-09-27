import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments-fixture';

// mockamos o prisma pra isolar o repositorio. o foco aqui e testar
// o que o repositorio pede pro banco (quais metodos, com qual where)
// e o que ele devolve. a logica de negocio fica no service, nao entra.
// o mock do $transaction ja devolve um tx pronto que chama o callback,
// assim os testes de fluxo com transacao (create) funcionam sem setup extra.
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // $transaction fake que entrega um tx com os metodos usados
    // pelo create do repositorio. ja resolve com o mockappointment,
    // porque e o retorno esperado no teste.
    $transaction: vi.fn(async (cb: any) => {
      return cb({
        appointment: {
          create: vi.fn().mockResolvedValue(mockAppointment),
          findUnique: vi.fn().mockResolvedValue(mockAppointment),
        },
        appointmentItem: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        scheduleSlot: {
          update: vi.fn(),
        },
      });
    }),
  },
}));

// testes do appointment-repository.
// cobrem a listagem, a busca por id e a criacao dentro de transacao.
describe('AppointmentRepository', () => {
  let appRepo: AppointmentRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre os testes.
    vi.clearAllMocks();
    appRepo = new AppointmentRepository();
  });

  // verifica que o findall repassa pro prisma.findmany e devolve
  // o resultado sem transformacao.
  it('deve listar agendamentos', async () => {
    (prisma.appointment.findMany as any).mockResolvedValue(mockAppointmentsList);

    const result = await appRepo.findAll();

    expect(result).toEqual(mockAppointmentsList);
    expect(prisma.appointment.findMany).toHaveBeenCalled();
  });

  // verifica que o findbyid chama o prisma.findunique com o where
  // certo e com um include (as projections podem mudar sem quebrar
  // o teste, por isso o expect.any(object)).
  it('deve buscar agendamento por ID', async () => {
    (prisma.appointment.findUnique as any).mockResolvedValue(mockAppointment);

    const result = await appRepo.findById(1);

    expect(result).toEqual(mockAppointment);
    expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: expect.any(Object),
    });
  });

  // verifica que a criacao passa pela transacao do prisma. o mock do
  // $transaction ja cobre os passos internos (criar consulta, criar
  // itens, buscar de volta).
  it('deve criar agendamento no banco com transação', async () => {
    const result = await appRepo.create({
      patientId: 1,
      scheduledDate: new Date('2025-10-15T10:00:00.000Z'),
      scheduledTime: '10:00',
      items: [{ medicineId: 1, quantity: 2 }],
    });

    expect(result).toEqual(mockAppointment);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});