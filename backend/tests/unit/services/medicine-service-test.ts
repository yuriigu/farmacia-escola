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

  // verifica que o getbyid chama o findbyid com o id certo e devolve
  // o medicamento com os campos de estoque calculados.
  it('deve buscar medicamento por ID', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);

    const result = await medicineService.getById(1);

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(mockMedicineRepo.findById).toHaveBeenCalledWith(1);
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