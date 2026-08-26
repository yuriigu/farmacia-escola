import { PatientRepository } from '../repositories/PatientRepository';
import { ActivityLogService } from './ActivityLogService';

export class PatientService {
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  async getAll(role: string, userId: number, search?: string) {
    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      return patient ? [patient] : [];
    }
    return this.patientRepo.findAll(search);
  }

  async getById(id: number, role: string, userId: number) {
    const patient = await this.patientRepo.findById(id);
    if (!patient) throw { statusCode: 404, message: 'Paciente não encontrado' };

    if (role === 'PACIENTE' && patient.userId !== userId) {
      throw { statusCode: 403, message: 'Acesso não autorizado ao prontuário' };
    }

    return patient;
  }

  async create(userId: number, role: string, data: {
    name: string;
    cpf: string;
    phone?: string;
    birthDate?: string;
    address?: string;
  }) {
    const { name, cpf, phone, birthDate, address } = data;

    if (!name || !cpf) {
      throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
    }

    const existing = await this.patientRepo.findByCpf(cpf);
    if (existing) {
      throw { statusCode: 409, message: 'CPF já cadastrado no sistema' };
    }

    const patient = await this.patientRepo.create({
      name,
      cpf,
      phone,
      birthDate: birthDate ? new Date(birthDate) : null,
      address,
    });

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'create',
        'patients',
        patient.id,
        `Cadastrou paciente ${patient.name} (CPF: ${patient.cpf})`
      );
    }

    return patient;
  }

  async update(userId: number, role: string, id: number, data: any) {
    const existing = await this.patientRepo.findById(id);
    if (!existing) throw { statusCode: 404, message: 'Paciente não encontrado' };

    const updateData: any = { ...data };
    if (data.birthDate) {
      updateData.birthDate = new Date(data.birthDate);
    }

    const updated = await this.patientRepo.update(id, updateData);

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'update',
        'patients',
        id,
        `Atualizou dados do paciente ${updated.name}`
      );
    }

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const existing = await this.patientRepo.findById(id);
    if (!existing) throw { statusCode: 404, message: 'Paciente não encontrado' };

    const deleted = await this.patientRepo.delete(id);

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'delete',
        'patients',
        id,
        `Excluiu paciente ${existing.name}`
      );
    }

    return { message: 'Paciente excluído com sucesso' };
  }
}
