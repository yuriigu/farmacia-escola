import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientService } from '../../../src/services/patient-service';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { mockPatient, mockPatientsList } from '../../fixtures/patients-fixture';

// mockamos o repositorio de paciente e o activity-log-service pra
// isolar o patient-service. os testes cobrem o crud basico do
// paciente: listar, buscar, criar, atualizar e excluir. o foco aqui
// e a delegacao pro repositorio e as validacoes do service (cpf
// obrigatorio, unicidade de cpf, existencia antes de editar/excluir).
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do patient-service.
// cobrem os caminhos felizes do crud e a regra de cpf unico.
describe('PatientService', () => {
  let patientService: PatientService;
  let mockPatientRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de paciente com os metodos usados pelo service.
    mockPatientRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByCpf: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // quando o service instancia o repositorio no construtor,
    // essa implementacao entrega o mock no lugar.
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    patientService = new PatientService();
  });

  // verifica que o getall, no caso do admin, delega pro findall do
  // repo sem filtro de dono.
  it('deve listar pacientes', async () => {
    mockPatientRepo.findAll.mockResolvedValue(mockPatientsList);

    const result = await patientService.getAll('ADMIN', 1);

    expect(result).toEqual(mockPatientsList);
    expect(mockPatientRepo.findAll).toHaveBeenCalledTimes(1);
  });

  // verifica que o getbyid chama o findbyid com o id certo. no caso
  // de admin, a autorizacao por dono nao se aplica.
  it('deve buscar paciente por ID', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);

    const result = await patientService.getById(1, 'ADMIN', 1);

    expect(result).toEqual(mockPatient);
    expect(mockPatientRepo.findById).toHaveBeenCalledWith(1);
  });

  // caminho feliz do create: cpf livre, entao o service passa pela
  // checagem e delega pro create do repo.
  it('deve criar novo paciente com CPF único', async () => {
    mockPatientRepo.findByCpf.mockResolvedValue(null);
    mockPatientRepo.create.mockResolvedValue(mockPatient);

    const result = await patientService.create(1, 'FARMACEUTICO', {
      name: mockPatient.name,
      cpf: mockPatient.cpf,
      phone: mockPatient.phone,
    });

    expect(result).toEqual(mockPatient);
    expect(mockPatientRepo.create).toHaveBeenCalled();
  });

  // cpf ja cadastrado: o service precisa cortar com 409 antes mesmo
  // de tentar criar.
  it('deve lançar erro se CPF já estiver cadastrado', async () => {
    mockPatientRepo.findByCpf.mockResolvedValue(mockPatient);

    await expect(
      patientService.create(1, 'FARMACEUTICO', {
        name: 'Outro Paciente',
        cpf: mockPatient.cpf,
      })
    ).rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
  });

  // caminho feliz do update: precisa que o paciente exista antes
  // (findbyid), e o retorno deve refletir as mudancas.
  it('deve atualizar dados do paciente', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);
    mockPatientRepo.update.mockResolvedValue({
      ...mockPatient,
      name: 'Maria Silva Atualizada',
    });

    const result = await patientService.update(1, 'FARMACEUTICO', 1, {
      name: 'Maria Silva Atualizada',
    });

    expect(result.name).toBe('Maria Silva Atualizada');
  });

  // caminho feliz do delete: o service checa existencia antes de
  // chamar o delete do repo. no caso do service, e soft delete.
  it('deve excluir paciente', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);
    mockPatientRepo.delete.mockResolvedValue(mockPatient);

    const result = await patientService.delete(1, 'ADMIN', 1);

    expect(result).toBeDefined();
    expect(mockPatientRepo.delete).toHaveBeenCalledWith(1);
  });
});