import { WithdrawalRepository } from '../repositories/WithdrawalRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { ActivityLogService } from './ActivityLogService';

export class WithdrawalService {
  private withdrawalRepo: WithdrawalRepository;
  private batchRepo: BatchRepository;
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    this.withdrawalRepo = new WithdrawalRepository();
    this.batchRepo = new BatchRepository();
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  async getAll(userRole: string, patientId?: number | null) {
    if (userRole === 'PACIENTE' && patientId) {
      return this.withdrawalRepo.findAll(patientId);
    }
    return this.withdrawalRepo.findAll();
  }

  async create(userId: number, role: string, data: {
    patientName: string;
    patientCpf: string;
    batchId: number;
    quantity: number;
    notes?: string;
    appointmentId?: number;
  }) {
    const { patientName, patientCpf, batchId, quantity, notes, appointmentId } = data;

    if (!patientName || !patientCpf || !batchId || !quantity) {
      throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
    }

    if (quantity <= 0) {
      throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
    }

    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    if (batch.currentQuantity < quantity) {
      throw { statusCode: 400, message: 'Estoque insuficiente para esta dispensação' };
    }

    let patient = await this.patientRepo.findByCpf(patientCpf);
    if (!patient) {
      patient = await this.patientRepo.create({
        name: patientName,
        cpf: patientCpf,
      });
    }

    const withdrawal = await this.withdrawalRepo.create({
      patientId: patient.id,
      userId,
      notes,
      appointmentId,
      items: [{ batchId, quantity }],
    });

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'create',
        'withdrawals',
        withdrawal.id,
        `Dispensou ${quantity} unidade(s) do lote ${batch.batchNumber} para ${patient.name}`
      );
    }

    return withdrawal;
  }
}
