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
      let patientList: Exclude<typeof patient, null>[] = [];
      if (patient) {
        patientList = [patient];
      } else {
        patientList = [];
      }
      return patientList;
    }
    let cleanSearch = undefined;
    if (search) {
      cleanSearch = search.trim();
    } else {
      cleanSearch = undefined;
    }
    return this.patientRepo.findAll(cleanSearch);
  }

  async getById(id: number, role: string, userId: number) {
    const patient = await this.patientRepo.findById(id);
    if (!patient) {
      throw { statusCode: 404, message: 'Paciente não encontrado' };
    }

    if (role === 'PACIENTE') {
      if (patient.userId !== userId) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao prontuário' };
      }
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

    let cleanName = '';
    if (name) {
      cleanName = name.trim();
    } else {
      cleanName = '';
    }

    let cleanCpf = '';
    if (cpf) {
      cleanCpf = cpf.replace(/\D/g, '');
    } else {
      cleanCpf = '';
    }

    if (!cleanName) {
      throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
    } else {
      if (!cleanCpf) {
        throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
      }
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

    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.trim();
    } else {
      cleanPhone = null;
    }

    let cleanAddress = null;
    if (address) {
      cleanAddress = address.trim();
    } else {
      cleanAddress = null;
    }

    const patient = await this.patientRepo.create({
      name: cleanName,
      cpf: cleanCpf,
      phone: cleanPhone,
      birthDate: parsedBirthDate,
      address: cleanAddress,
    });

    let isStaff = false;
    if (role === 'FARMACEUTICO') {
      isStaff = true;
    } else {
      if (role === 'ADMIN') {
        isStaff = true;
      } else {
        isStaff = false;
      }
    }

    if (isStaff) {
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
    if (!existing) {
      throw { statusCode: 404, message: 'Paciente não encontrado' };
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) {
        throw { statusCode: 400, message: 'Nome não pode ser vazio' };
      }
      updateData.name = cleanName;
    }

    if (data.cpf !== undefined) {
      const cleanCpf = data.cpf.replace(/\D/g, '');
      if (!cleanCpf) {
        throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
      } else {
        if (cleanCpf.length !== 11) {
          throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
        }
      }
      if (cleanCpf !== existing.cpf) {
        const cpfOccupied = await this.patientRepo.findByCpf(cleanCpf);
        if (cpfOccupied) {
          throw { statusCode: 409, message: 'CPF já cadastrado para outro paciente' };
        }
      }
      updateData.cpf = cleanCpf;
    }

    if (data.phone !== undefined) {
      let updatePhone = null;
      if (data.phone) {
        updatePhone = data.phone.trim();
      } else {
        updatePhone = null;
      }
      updateData.phone = updatePhone;
    }

    if (data.address !== undefined) {
      let updateAddress = null;
      if (data.address) {
        updateAddress = data.address.trim();
      } else {
        updateAddress = null;
      }
      updateData.address = updateAddress;
    }

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

    let isStaff = false;
    if (role === 'FARMACEUTICO') {
      isStaff = true;
    } else {
      if (role === 'ADMIN') {
        isStaff = true;
      } else {
        isStaff = false;
      }
    }

    if (isStaff) {
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
    if (!existing) {
      throw { statusCode: 404, message: 'Paciente não encontrado' };
    }

    await this.patientRepo.delete(id);

    let isStaff = false;
    if (role === 'FARMACEUTICO') {
      isStaff = true;
    } else {
      if (role === 'ADMIN') {
        isStaff = true;
      } else {
        isStaff = false;
      }
    }

    if (isStaff) {
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
