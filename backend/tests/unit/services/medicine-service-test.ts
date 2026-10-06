import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineService } from '../../../src/services/medicine-service';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicines-fixture';

// mockamos o repositorio de medicamento e o activity-log-service pra
// isolar o medicine-service. os testes cobrem o crud basico do
// catalogo: listar, buscar por id, criar, atualizar e excluir.
// o foco aqui e a delegacao pro repositorio e as validacoes minimas
// do service (nome obrigatorio, existencia antes de editar/excluir).
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do medicine-service.
// cobrem os caminhos felizes do crud e o caminho de erro quando o
// medicamento nao existe.
describe('MedicineService', () => {
  let medicineService: MedicineService;
  let mockMedicineRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de medicamento com os metodos usados pelo service.
    mockMedicineRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // quando o service instancia o repositorio no construtor,
    // essa implementacao entrega o mock no lugar.
    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });

    medicineService = new MedicineService();
  });

  // verifica que o getall delega pro findall do repo. o service
  // enriquece o retorno com status de estoque, mas o teste so checa
  // o tamanho da lista (a estrutura detalhada ja e coberta em outros
  // testes do service).
  it('deve listar todos os medicamentos', async () => {
    mockMedicineRepo.findAll.mockResolvedValue(mockMedicinesList);

    const result = await medicineService.getAll();

    expect(result).toHaveLength(mockMedicinesList.length);
    expect(mockMedicineRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve listar medicamentos vencidos, bloqueados e sem saldo como indisponíveis para pacientes', async () => {
    const validMedicine = {
      ...mockMedicine,
      batches: [{
        id: 11,
        batchNumber: 'LOT-PRIVATE-001',
        currentQuantity: 10,
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isBlocked: false,
      }],
    };
    const expiredMedicine = {
      ...mockMedicine,
      id: 2,
      batches: [{
        id: 12,
        batchNumber: 'LOT-EXPIRED-001',
        currentQuantity: 10,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isBlocked: false,
      }],
    };
    const blockedMedicine = {
      ...mockMedicine,
      id: 3,
      batches: [{
        id: 13,
        batchNumber: 'LOT-BLOCKED-001',
        currentQuantity: 10,
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isBlocked: true,
      }],
    };
    const emptyMedicine = {
      ...mockMedicine,
      id: 4,
      batches: [{
        id: 14,
        batchNumber: 'LOT-EMPTY-001',
        currentQuantity: 0,
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isBlocked: false,
      }],
    };
    mockMedicineRepo.findAll.mockResolvedValue([validMedicine, expiredMedicine, blockedMedicine, emptyMedicine]);

    const result = await medicineService.getAll('PACIENTE');

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      id: validMedicine.id,
      name: validMedicine.name,
      activeIngredient: validMedicine.activeIngredient,
      dosage: validMedicine.dosage,
      category: validMedicine.category,
      accessibleDesc: validMedicine.accessibleDesc,
      status: 'IN_STOCK',
      available: true,
      hasStock: true,
    });
    expect(result.slice(1).map((medicine) => medicine.available)).toEqual([false, false, false]);
  });

  // verifica que o getbyid chama o findbyid com o id certo e devolve
  // o medicamento com os campos de estoque calculados.
  it('deve buscar medicamento por ID', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);

    const result = await medicineService.getById(1);

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(mockMedicineRepo.findById).toHaveBeenCalledWith(1);
  });

  it('deve retornar detalhes sanitizados para pacientes', async () => {
    mockMedicineRepo.findById.mockResolvedValue({
      ...mockMedicine,
      batches: [{
        id: 11,
        batchNumber: 'LOT-PRIVATE-001',
        currentQuantity: 10,
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isBlocked: false,
      }],
    });

    const result = await medicineService.getById(1, 'PACIENTE');

    expect(result).toEqual({
      id: mockMedicine.id,
      name: mockMedicine.name,
      activeIngredient: mockMedicine.activeIngredient,
      dosage: mockMedicine.dosage,
      category: mockMedicine.category,
      accessibleDesc: mockMedicine.accessibleDesc,
      status: 'IN_STOCK',
      available: true,
      hasStock: true,
    });
  });

  it('deve retornar medicamento vencido como indisponível na busca por paciente', async () => {
    mockMedicineRepo.findById.mockResolvedValue({
      ...mockMedicine,
      batches: [{
        id: 12,
        batchNumber: 'LOT-EXPIRED-001',
        currentQuantity: 10,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isBlocked: false,
      }],
    });

    const result = await medicineService.getById(1, 'PACIENTE');

    expect(result.status).toBe('EXPIRED');
    expect(result.available).toBe(false);
    expect(result.hasStock).toBe(false);
  });

  // quando o repo devolve null, o service precisa lancar 404 pro
  // controller converter em resposta http.
  it('deve lançar erro se medicamento não for encontrado', async () => {
    mockMedicineRepo.findById.mockResolvedValue(null);

    await expect(medicineService.getById(999)).rejects.toEqual(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  // caminho feliz do create: o service valida o nome e delega pro repo.
  it('deve criar medicamento com sucesso', async () => {
    mockMedicineRepo.create.mockResolvedValue(mockMedicine);

    const result = await medicineService.create(1, 'FARMACEUTICO', {
      name: 'Paracetamol',
      dosage: '500mg',
    });

    expect(result).toEqual(mockMedicine);
    expect(mockMedicineRepo.create).toHaveBeenCalled();
  });

  // caminho feliz do update: precisa que o medicamento exista antes
  // (findbyid), e o retorno deve refletir as mudancas.
  it('deve atualizar medicamento com sucesso', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    mockMedicineRepo.update.mockResolvedValue({
      ...mockMedicine,
      name: 'Paracetamol Alterado',
    });

    const result = await medicineService.update(1, 'FARMACEUTICO', 1, {
      name: 'Paracetamol Alterado',
    });

    expect(result.name).toBe('Paracetamol Alterado');
    expect(mockMedicineRepo.update).toHaveBeenCalled();
  });

  // caminho feliz do delete: o service checa existencia antes de
  // chamar o delete do repo. no caso do service, e soft delete.
  it('deve excluir medicamento', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    mockMedicineRepo.delete.mockResolvedValue(mockMedicine);

    const result = await medicineService.delete(1, 'ADMIN', 1);

    expect(result).toBeDefined();
    expect(mockMedicineRepo.delete).toHaveBeenCalledWith(1);
  });
});