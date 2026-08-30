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
    const cleanSearch = search?.trim() || undefined;
    return this.patientRepo.findAll(cleanSearch);
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
    birthDate?: string | Date;
    address?: string;
  }) {
    const { name, cpf, phone, birthDate, address } = data;

    const cleanName = name?.trim();
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    if (!cleanName || !cleanCpf) {
      throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
    }

    if (cleanCpf.length !== 11) {
      throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
    }

    const existing = await this.patientRepo.findByCpf(cleanCpf);
    if (existing) {
      throw { statusCode: 409, message: 'CPF já cadastrado no sistema' };
    }

    let parsedBirthDate: Date | null = null;
    if (birthDate) {
      parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        throw { statusCode: 400, message: 'Data de nascimento inválida' };
      }
    }

    const patient = await this.patientRepo.create({
      name: cleanName,
      cpf: cleanCpf,
      phone: phone?.trim() || null,
      birthDate: parsedBirthDate,
      address: address?.trim() || null,
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

  async update(userId: number, role: string, id: number, data: {
    name?: string;
    cpf?: string;
    phone?: string;
    birthDate?: string | Date;
    address?: string;
  }) {
    const existing = await this.patientRepo.findById(id);
    if (!existing) throw { statusCode: 404, message: 'Paciente não encontrado' };

    const updateData: any = {};

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) throw { statusCode: 400, message: 'Nome não pode ser vazio' };
      updateData.name = cleanName;
    }

    if (data.cpf !== undefined) {
      const cleanCpf = data.cpf.replace(/\D/g, '');
      if (!cleanCpf || cleanCpf.length !== 11) {
        throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
      }
      if (cleanCpf !== existing.cpf) {
        const cpfOccupied = await this.patientRepo.findByCpf(cleanCpf);
        if (cpfOccupied) {
          throw { statusCode: 409, message: 'CPF já cadastrado para outro paciente' };
        }
      }
      updateData.cpf = cleanCpf;
    }

    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.address !== undefined) updateData.address = data.address.trim() || null;

    if (data.birthDate !== undefined) {
      if (!data.birthDate) {
        updateData.birthDate = null;
      } else {
        const parsedDate = new Date(data.birthDate);
        if (isNaN(parsedDate.getTime())) {
          throw { statusCode: 400, message: 'Data de nascimento inválida' };
        }
        updateData.birthDate = parsedDate;
      }
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

    await this.patientRepo.delete(id);

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