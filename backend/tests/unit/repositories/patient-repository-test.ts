import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockPatient, mockPatientsList } from '../../fixtures/patients-fixture';

// mockamos o prisma pra isolar o repositorio. o foco aqui e testar
// o que o repositorio pede pro banco (quais metodos, com qual where)
// e o que ele devolve. a regra de negocio (validacao de cpf, soft delete,
// autorizacao por dono) fica no service, nao entra.
// findfirst aparece no mock porque o findbycpf usa ele (por causa
// do filtro extra de deletedat junto com o cpf).
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// testes do patient-repository.
// cobrem listagem, busca por cpf (nos dois formatos) e criacao.
describe('PatientRepository', () => {
  let patientRepo: PatientRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre os testes.
    vi.clearAllMocks();
    patientRepo = new PatientRepository();
  });

  // verifica que o findall chama o findmany e devolve o resultado
  // sem transformacao no repositorio.
  it('deve listar pacientes', async () => {
    (prisma.patient.findMany as any).mockResolvedValue(mockPatientsList);

    const result = await patientRepo.findAll();

    expect(result).toEqual(mockPatientsList);
    expect(prisma.patient.findMany).toHaveBeenCalled();
  });

  // aqui a gente testa o ponto mais chatinho do repositorio: a busca
  // por cpf aceita tanto o formato limpo (11 digitos) quanto o formatado
  // (123.456.789-01). o repositorio normaliza antes de consultar, entao
  // os dois caminhos precisam devolver o mesmo paciente.
  it('deve buscar paciente por CPF com ou sem formatacao', async () => {
    (prisma.patient.findFirst as any).mockResolvedValue(mockPatient);

    const byClean = await patientRepo.findByCpf('12345678901');
    expect(byClean).toEqual(mockPatient);

    (prisma.patient.findFirst as any).mockResolvedValue(mockPatient);
    const byFormatted = await patientRepo.findByCpf('123.456.789-01');

    expect(byFormatted).toEqual(mockPatient);
    expect(prisma.patient.findFirst).toHaveBeenCalled();
  });

  // verifica que o create chama o create do prisma e devolve o
  // resultado como veio.
  it('deve criar paciente', async () => {
    (prisma.patient.create as any).mockResolvedValue(mockPatient);

    const result = await patientRepo.create({
      name: 'Maria Silva',
      cpf: '12345678901',
    });

    expect(result).toEqual(mockPatient);
    expect(prisma.patient.create).toHaveBeenCalled();
  });
});