import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/services/api';
import apiClient from '@/lib/axios';

vi.mock('@/lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('api service tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth API', () => {
    it('login deve chamar /api/auth/login com email e senha', async () => {
      const mockResponse = { data: { token: 'token-123', user: { id: 1, name: 'Admin', role: 'ADMIN' } } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await api.auth.login('admin@farmacia.ufba.br', 'senha123');

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'admin@farmacia.ufba.br',
        password: 'senha123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('me deve chamar /api/auth/me', async () => {
      const mockResponse = { data: { id: 1, name: 'Admin', role: 'ADMIN' } };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await api.auth.me();

      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('medicines API', () => {
    it('getAll deve chamar /api/medicines', async () => {
      const mockMeds = [{ id: 1, name: 'Paracetamol' }];
      (apiClient.get as any).mockResolvedValue({ data: mockMeds });

      const result = await api.medicines.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/medicines');
      expect(result).toEqual(mockMeds);
    });

    it('getById deve chamar /api/medicines/:id', async () => {
      const mockMed = { id: 1, name: 'Paracetamol' };
      (apiClient.get as any).mockResolvedValue({ data: mockMed });

      const result = await api.medicines.getById(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/medicines/1');
      expect(result).toEqual(mockMed);
    });

    it('create deve chamar /api/medicines com dados', async () => {
      const payload = { name: 'Ibuprofeno', dosage: '400mg' };
      (apiClient.post as any).mockResolvedValue({ data: { id: 2, ...payload } });

      const result = await api.medicines.create(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/medicines', payload);
      expect(result.id).toBe(2);
    });
  });

  describe('patients API', () => {
    it('getAll deve chamar /api/patients', async () => {
      const mockPatients = [{ id: 1, name: 'Maria Silva Santos' }];
      (apiClient.get as any).mockResolvedValue({ data: mockPatients });

      const result = await api.patients.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/patients', { params: undefined });
      expect(result).toEqual(mockPatients);
    });

    it('getAll com busca deve passar params de busca', async () => {
      const mockPatients = [{ id: 1, name: 'Maria Silva Santos' }];
      (apiClient.get as any).mockResolvedValue({ data: mockPatients });

      const result = await api.patients.getAll('Maria');

      expect(apiClient.get).toHaveBeenCalledWith('/api/patients', { params: { search: 'Maria' } });
      expect(result).toEqual(mockPatients);
    });
  });

  describe('appointments API', () => {
    it('getAll deve chamar /api/appointments', async () => {
      const mockAppts = [{ id: 1, status: 'PENDING' }];
      (apiClient.get as any).mockResolvedValue({ data: mockAppts });

      const result = await api.appointments.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/appointments');
      expect(result).toEqual(mockAppts);
    });
  });
});
