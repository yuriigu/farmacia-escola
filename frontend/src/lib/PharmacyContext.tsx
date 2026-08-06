import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from './api';
import {
  Appointment,
  computeStockStatus,
  Disposal,
  InventoryItem,
  Withdrawal,
} from './types';

// === Draft Types (utilizados nos formulários de criação) ===

export interface MedicineDraft {
  name: string;
  dosage: string;
  category: string;
  unit: string;
  minStock: number;
  stock: number;
  expirationDate: string;
}

export interface BatchEntryDraft {
  medicineName: string;
  dosage: string;
  batchCode: string;
  quantity: number;
  expirationDate: string;
  supplier: string;
}

export interface WithdrawalDraft {
  patientName: string;
  cpf: string;
  inventoryItemId: string;
  quantity: number;
  dispensedBy: string;
  notes: string;
}

export interface DisposalDraft {
  inventoryItemId: string;
  quantity: number;
  reason: string;
}

export interface AppointmentDraft {
  patientName: string;
  date: string;
  time: string;
  pharmacist: string;
  type: string;
}

interface PharmacyContextValue {
  inventory: InventoryItem[];
  withdrawals: Withdrawal[];
  disposals: Disposal[];
  appointments: Appointment[];
  loading: boolean;
  offline: boolean;
  addMedicine: (draft: MedicineDraft) => Promise<void>;
  updateMedicine: (id: string, draft: MedicineDraft) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  registerBatchEntry: (draft: BatchEntryDraft) => Promise<void>;
  registerWithdrawal: (draft: WithdrawalDraft) => Promise<boolean>;
  updateWithdrawal: (id: string, notes: string) => Promise<void>;
  cancelWithdrawal: (id: string) => Promise<void>;
  registerDisposal: (draft: DisposalDraft) => Promise<boolean>;
  updateDisposal: (id: string, reason: string) => Promise<void>;
  deleteDisposal: (id: string) => Promise<void>;
  revertDisposal: (id: string) => Promise<void>;
  addAppointment: (draft: AppointmentDraft) => Promise<void>;
  confirmAppointment: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const PharmacyContext = createContext<PharmacyContextValue | null>(null);

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, wd, disp, appt] = await Promise.all([
        api.get<InventoryItem[]>('/inventory'),
        api.get<Withdrawal[]>('/withdrawals'),
        api.get<Disposal[]>('/disposals'),
        api.get<Appointment[]>('/appointments'),
      ]);
      
      setInventory(inv.data);
      setWithdrawals(wd.data);
      setDisposals(disp.data);
      setAppointments(appt.data);
      setOffline(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setOffline(true);
      toast.error('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  const addMedicine = useCallback(async (draft: MedicineDraft) => {
    try {
      await api.post('/medicines', draft);
      await fetchData();
      toast.success('Medicamento cadastrado com sucesso.');
    } catch (error) {
      toast.error('Erro ao cadastrar medicamento.');
      throw error;
    }
  }, [fetchData]);

  const updateMedicine = useCallback(async (id: string, draft: MedicineDraft) => {
    try {
      await api.put(`/medicines/${id}`, draft);
      await fetchData();
      toast.success('Medicamento atualizado.');
    } catch (error) {
      toast.error('Erro ao atualizar medicamento.');
      throw error;
    }
  }, [fetchData]);

  const deleteMedicine = useCallback(async (id: string) => {
    try {
      await api.delete(`/medicines/${id}`);
      await fetchData();
      toast.success('Medicamento excluído.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao excluir medicamento.');
      throw error;
    }
  }, [fetchData]);

  const registerBatchEntry = useCallback(async (draft: BatchEntryDraft) => {
    try {
      await api.post('/batches', draft);
      await fetchData();
      toast.success('Entrada de lote registrada com sucesso.');
    } catch (error) {
      toast.error('Erro ao registrar entrada de lote.');
      throw error;
    }
  }, [fetchData]);

  const registerWithdrawal = useCallback(async (draft: WithdrawalDraft) => {
    try {
      await api.post('/withdrawals', draft);
      await fetchData();
      toast.success('Retirada registrada com sucesso.');
      return true;
    } catch (error) {
      toast.error('Erro ao registrar retirada.');
      return false;
    }
  }, [fetchData]);

  const registerDisposal = useCallback(async (draft: DisposalDraft) => {
    try {
      await api.post('/disposals', draft);
      await fetchData();
      toast.success('Descarte registrado com sucesso.');
      return true;
    } catch (error) {
      toast.error('Erro ao registrar descarte.');
      return false;
    }
  }, [fetchData]);

  const revertDisposal = useCallback(async (id: string) => {
    try {
      await api.post(`/disposals/${id}/revert`);
      await fetchData();
      toast.success('Descarte revertido com sucesso.');
    } catch (error) {
      toast.error('Erro ao reverter descarte.');
      throw error;
    }
  }, [fetchData]);

  const updateDisposal = useCallback(async (id: string, reason: string) => {
    try {
      await api.put(`/disposals/${id}`, { reason });
      await fetchData();
      toast.success('Motivo do descarte atualizado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar descarte.');
      throw error;
    }
  }, [fetchData]);

  const deleteDisposal = useCallback(async (id: string) => {
    try {
      await api.delete(`/disposals/${id}`);
      await fetchData();
      toast.success('Registro de descarte removido.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao remover descarte.');
      throw error;
    }
  }, [fetchData]);

  const updateWithdrawal = useCallback(async (id: string, notes: string) => {
    try {
      await api.put(`/withdrawals/${id}`, { notes });
      await fetchData();
      toast.success('Observações da retirada atualizadas.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar retirada.');
      throw error;
    }
  }, [fetchData]);

  const cancelWithdrawal = useCallback(async (id: string) => {
    try {
      await api.delete(`/withdrawals/${id}`);
      await fetchData();
      toast.success('Retirada cancelada e estoque restaurado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao cancelar retirada.');
      throw error;
    }
  }, [fetchData]);

  const addAppointment = useCallback(async (draft: AppointmentDraft) => {
    try {
      await api.post('/appointments', draft);
      await fetchData();
      toast.success('Agendamento criado com sucesso.');
    } catch (error) {
      toast.error('Erro ao criar agendamento.');
      throw error;
    }
  }, [fetchData]);

  const confirmAppointment = useCallback(async (id: string) => {
    try {
      await api.patch(`/appointments/${id}/confirm`);
      await fetchData();
      toast.success('Agendamento confirmado.');
    } catch (error) {
      toast.error('Erro ao confirmar agendamento.');
      throw error;
    }
  }, [fetchData]);

  const cancelAppointment = useCallback(async (id: string) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      await fetchData();
      toast.success('Agendamento cancelado.');
    } catch (error) {
      toast.error('Erro ao cancelar agendamento.');
      throw error;
    }
  }, [fetchData]);

  const value = useMemo<PharmacyContextValue>(
    () => ({
      inventory,
      withdrawals,
      disposals,
      appointments,
      loading,
      offline,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      registerBatchEntry,
      registerWithdrawal,
      updateWithdrawal,
      cancelWithdrawal,
      registerDisposal,
      updateDisposal,
      deleteDisposal,
      revertDisposal,
      addAppointment,
      confirmAppointment,
      cancelAppointment,
      fetchData,
    }),
    [
      inventory,
      withdrawals,
      disposals,
      appointments,
      loading,
      offline,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      registerBatchEntry,
      registerWithdrawal,
      updateWithdrawal,
      cancelWithdrawal,
      registerDisposal,
      updateDisposal,
      deleteDisposal,
      revertDisposal,
      addAppointment,
      confirmAppointment,
      cancelAppointment,
      fetchData,
    ]
  );

  return <PharmacyContext.Provider value={value}>{children}</PharmacyContext.Provider>;
}

export function usePharmacy(): PharmacyContextValue {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy precisa ser usado dentro de PharmacyProvider.');
  }
  return context;
}