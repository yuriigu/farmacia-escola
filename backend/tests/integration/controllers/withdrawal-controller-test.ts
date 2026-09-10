import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalController } from '../../../src/controllers/withdrawal-controller';
import { WithdrawalService } from '../../../src/services/withdrawal-service';

vi.mock('../../../src/services/withdrawal-service');
vi.mock('../../../src/services/activity-log-service');

describe('WithdrawalController Integration', () => {
  let withdrawalController: WithdrawalController;
  let mockWithdrawalService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithdrawalService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
    };
    (WithdrawalService as any).mockImplementation(function () {
      return mockWithdrawalService;
    });
    withdrawalController = new WithdrawalController();
  });

  it('deve listar retiradas', async () => {
    const mockReq = { user: { userId: 1, role: 'ADMIN', patientId: null } } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockWithdrawalService.getAll.mockResolvedValue([]);

    await withdrawalController.getAll(mockReq, mockRes);

    expect(mockWithdrawalService.getAll).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it('deve criar retirada com status 201', async () => {
    const mockReq = {
      user: { userId: 1, role: 'FARMACEUTICO' },
      body: { patientName: 'Maria', patientCpf: '12345678901', batchId: 1, quantity: 2 },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockWithdrawalService.create.mockResolvedValue({ id: 1, quantity: 2 });

    await withdrawalController.create(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, quantity: 2 });
  });
});