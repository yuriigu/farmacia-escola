import { PatientRepository } from '../repositories/patient-repository';
import { ActivityLogService } from './activity-log-service';

// service de paciente. concentra as regras de negocio do cadastro
// de pacientes: listar, buscar, criar, atualizar e excluir (soft delete).
// a autorizacao fina (paciente so ve o proprio prontuario) fica aqui,
// junto com as validacoes de cpf e data de nascimento.
// o log de auditoria e registrado apenas para a equipe (admin e farmaceutico),
// porque paciente editando o proprio perfil nao precisa gerar trilha.
export class PatientService {
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    // repositorio de paciente e service de log de auditoria.
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  // lista pacientes. paciente comum recebe so o proprio registro.
  // a equipe recebe a lista completa, com filtro opcional de busca
  // por nome ou cpf.
  async getAll(role: string, userId: number, search?: string) {
    // se for paciente, devolvemos so o cadastro dele. se por algum
    // motivo nao existir, devolvemos lista vazia.
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

    // pra equipe, aplica o filtro de busca quando veio.
    let cleanSearch = undefined;
    if (search) {
      cleanSearch = search.trim();
    } else {
      cleanSearch = undefined;
    }
    return this.patientRepo.findAll(cleanSearch);
  }

  // busca um paciente pelo id. paciente comum so ve o proprio prontuario.
  async getById(id: number, role: string, userId: number) {
    const patient = await this.patientRepo.findById(id);
    if (!patient) {
      throw { statusCode: 404, message: 'Paciente não encontrado' };
    }

    // se for paciente, precisa ser dono do prontuario.
    if (role === 'PACIENTE') {
      if (patient.userId !== userId) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao prontuário' };
      }
    }

    return patient;
  }

  // cria um novo paciente. valida nome, cpf (formato 11 digitos) e
  // data de nascimento, checa duplicidade de cpf e normaliza os campos
  // opcionais. log de auditoria so pra equipe.
  async create(userId: number, role: string, data: {
    name: string;
    cpf: string;
    phone?: string;
    birthDate?: string | Date;
    address?: string;
  }) {
    const { name, cpf, phone, birthDate, address } = data;

    // normaliza o nome (trim) e o cpf (so digitos).
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

    // nome e cpf sao obrigatorios.
    if (!cleanName) {
      throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
    } else {
      if (!cleanCpf) {
        throw { statusCode: 400, message: 'Nome e CPF são obrigatórios' };
      }
    }

    // cpf precisa ter exatamente 11 digitos.
    if (cleanCpf.length !== 11) {
      throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
    }

    // checa se o cpf ja esta cadastrado.
    const existing = await this.patientRepo.findByCpf(cleanCpf);
    if (existing) {
      throw { statusCode: 409, message: 'CPF já cadastrado no sistema' };
    }

    // normaliza a data de nascimento pra Date, ou null se nao veio.
    let parsedBirthDate: Date | null = null;
    if (birthDate) {
      parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        throw { statusCode: 400, message: 'Data de nascimento inválida' };
      }
    }

    // normaliza telefone e endereco (trim ou null).
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

    // chama o repositorio (/repositories/patient-repository.ts) pra criar.
    const patient = await this.patientRepo.create({
      name: cleanName,
      cpf: cleanCpf,
      phone: cleanPhone,
      birthDate: parsedBirthDate,
      address: cleanAddress,
    });

    // so gera log quando quem criou foi a equipe (admin ou farmaceutico).
    // aluno tambem pode criar pela rota, mas o log fica de fora aqui.
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

  // atualiza os dados do paciente. cada campo entra so quando veio
  // no payload. valida cpf (formato + unicidade) e data de nascimento
  // quando aplicavel. log so pra equipe.
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

    // nome, se veio, nao pode ser vazio.
    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) {
        throw { statusCode: 400, message: 'Nome não pode ser vazio' };
      }
      updateData.name = cleanName;
    }

    // cpf, se veio, precisa ter 11 digitos e nao pode estar em uso
    // por outro paciente.
    if (data.cpf !== undefined) {
      const cleanCpf = data.cpf.replace(/\D/g, '');
      if (!cleanCpf) {
        throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
      } else {
        if (cleanCpf.length !== 11) {
          throw { statusCode: 400, message: 'CPF inválido (deve conter 11 dígitos)' };
        }
      }
      // so checa duplicidade se o cpf realmente mudou em relacao ao atual.
      if (cleanCpf !== existing.cpf) {
        const cpfOccupied = await this.patientRepo.findByCpf(cleanCpf);
        if (cpfOccupied) {
          throw { statusCode: 409, message: 'CPF já cadastrado para outro paciente' };
        }
      }
      updateData.cpf = cleanCpf;
    }

    // telefone aceita null pra limpar.
    if (data.phone !== undefined) {
      let updatePhone = null;
      if (data.phone) {
        updatePhone = data.phone.trim();
      } else {
        updatePhone = null;
      }
      updateData.phone = updatePhone;
    }

    // endereco aceita null pra limpar.
    if (data.address !== undefined) {
      let updateAddress = null;
      if (data.address) {
        updateAddress = data.address.trim();
      } else {
        updateAddress = null;
      }
      updateData.address = updateAddress;
    }

    // data de nascimento aceita null pra limpar, ou valor parseavel.
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

    // chama o repositorio (/repositories/patient-repository.ts) pra persistir.
    const updated = await this.patientRepo.update(id, updateData);

    // mesma regra do create: log so pra equipe.
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

  // exclui um paciente. e soft delete (deletedAt), pra preservar
  // o historico de consultas e movimentacoes ligadas ao paciente.
  // log so pra equipe.
  async delete(userId: number, role: string, id: number) {
    const existing = await this.patientRepo.findById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Paciente não encontrado' };
    }

    // chama o repositorio (/repositories/patient-repository.ts) pra
    // aplicar o soft delete.
    await this.patientRepo.delete(id);

    // mesma regra: log so pra equipe.
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