import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicines-fixture';

// mockamos o prisma pra isolar o repositorio. o foco aqui e testar
// o que o repositorio pede pro banco (quais metodos, com qual where
// e qual include) e o que ele devolve. a logica de negocio (validacao,
// formatacao de dosagem, auditoria) fica no service, nao entra.
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    medicine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// testes do medicine-repository.
// cobrem as quatro operacoes principais do crud: listar, buscar por
// id, criar e deletar.
describe('MedicineRepository', () => {
  let medicineRepo: MedicineRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre os testes.
    vi.clearAllMocks();
    medicineRepo = new MedicineRepository();
  });

  // verifica que o findall chama o findmany e devolve o resultado
  // sem transformacao no repositorio.
  it('deve listar todos os medicamentos com lotes', async () => {
    (prisma.medicine.findMany as any).mockResolvedValue(mockMedicinesList);

    const result = await medicineRepo.findAll();

    expect(result).toEqual(mockMedicinesList);
    expect(prisma.medicine.findMany).toHaveBeenCalled();
  });

  // aqui o teste fixa o contrato do findbyid: ele precisa chamar o
  // findunique passando o id certo e um include de batches. se o
  // repositorio mudar a projection no futuro, o teste quebra de
  // proposito, porque a tela de detalhe depende disso.
  it('deve buscar medicamento por ID', async () => {
    (prisma.medicine.findUnique as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.findById(1);

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { batches: true },
    });
  });

  // verifica que o create chama o create do prisma e devolve o
  // resultado como veio.
  it('deve criar medicamento', async () => {
    (prisma.medicine.create as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.create({
      name: 'Paracetamol',
      dosage: '500mg',
    });

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.create).toHaveBeenCalled();
  });

  // verifica que o delete chama o delete do prisma com o where correto.
  // o nome "delete" aqui e o metodo do repositorio (que faz soft delete
  // via deletedat no service, mas o repo em si chama o delete do prisma
  // neste fluxo de teste).
  it('deve deletar medicamento', async () => {
    (prisma.medicine.delete as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.delete(1);

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});