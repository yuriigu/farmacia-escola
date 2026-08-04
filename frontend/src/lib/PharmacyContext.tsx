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

const INVENTORY_FALLBACK: InventoryItem[] = [
  { id: '1', name: 'Amoxicilina', dosage: '500mg', category: 'Antibiótico', stock: 12, minStock: 20, unit: 'Caixas', status: 'critical', expirationDate: '2027-11-20' },
  { id: '2', name: 'Paracetamol', dosage: '750mg', category: 'Analgésico', stock: 150, minStock: 50, unit: 'Caixas', status: 'ok', expirationDate: '2027-05-15' },
  { id: '3', name: 'Losartana Potássica', dosage: '50mg', category: 'Anti-hipertensivo', stock: 45, minStock: 40, unit: 'Caixas', status: 'low', expirationDate: '2026-09-10' },
  { id: '4', name: 'Omeprazol', dosage: '20mg', category: 'Antiácido', stock: 90, minStock: 30, unit: 'Caixas', status: 'ok', expirationDate: '2027-01-30' },
  { id: '5', name: 'Ibuprofeno', dosage: '600mg', category: 'Anti-inflamatório', stock: 0, minStock: 25, unit: 'Caixas', status: 'expired', expirationDate: '2025-02-10' },
];

const WITHDRAWALS_FALLBACK: Withdrawal[] = [
  { id: '1', patientName: 'Sônia Maria Ribeiro', cpf: '111.222.333-44', medicineName: 'Losartana Potássica 50mg', quantity: 2, date: '2026-08-03 14:20', dispensedBy: 'Farm. Luciana', inventoryItemId: '3' },
  { id: '2', patientName: 'Marcos Vinicius Santos', cpf: '555.666.777-88', medicineName: 'Paracetamol 750mg', quantity: 3, date: '2026-08-03 11:05', dispensedBy: 'Farm. Pedro', inventoryItemId: '2' },
];

const DISPOSALS_FALLBACK: Disposal[] = [
  {
    id: '1',
    patient: { id: 'p1', name: 'João Carlos Pereira', cpf: '123.456.789-00' },
    batch: { id: 'b1', code: 'LOT-9921', medicine: { id: 'm5', name: 'Ibuprofeno', dosage: '600mg' }, quantity: 2, expirationDate: '2025-02-10' },
    user: { id: 'u1', name: 'Farm. Luciana', email: 'luciana@farmacia.br' },
    reason: 'Medicamento Vencido',
    createdAt: '2026-08-01',
    inventoryItemId: '5',
    reverted: false,
  },
  {
    id: '2',
    patient: { id: 'p2', name: 'Helena Ribeiro', cpf: '987.654.321-11' },
    batch: { id: 'b2', code: 'LOT-4412', medicine: { id: 'm4', name: 'Omeprazol', dosage: '20mg' }, quantity: 1, expirationDate: '2027-01-30' },
    user: { id: 'u2', name: 'Farm. Pedro', email: 'pedro@farmacia.br' },
    reason: 'Embalagem Danificada',
    createdAt: '2026-08-02',
    inventoryItemId: '4',
    reverted: false,
  },
];

const APPOINTMENTS_FALLBACK: Appointment[] = [
  { id: '1', patientName: 'Ana Maria Souza', date: '2026-08-05', time: '09:00', pharmacist: 'Dra. Patricia', type: 'Orientação Farmacêutica', status: 'confirmado' },
  { id: '2', patientName: 'Carlos Eduardo Lima', date: '2026-08-05', time: '10:30', pharmacist: 'Dr. Roberto', type: 'Aferição de Pressão / Glicemia', status: 'pendente' },
  { id: '3', patientName: 'Juliana Mendes', date: '2026-08-05', time: '14:00', pharmacist: 'Dra. Patricia', type: 'Acompanhamento Farmacoterapêutico', status: 'concluido' },
];

export interface MedicineDraft {
  name: string;
  dosage: string;
  category: string;
  unit: string;
  minStock: number;
  stock: number;
  expirationDate: string;
}

export interface WithdrawalDraft {
  patientName: string;
  cpf: string;
  inventoryItemId: string;
  quantity: number;
  dispensedBy: string;
  notes?: string;
}

export interface DisposalDraft {
  inventoryItemId: string;
  quantity: number;
  reason: string;
}

export interface BatchEntryDraft {
  medicineName: string;
  dosage: string;
  batchCode: string;
  quantity: number;
  expirationDate: string;
  supplier?: string;
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
  addMedicine: (draft: MedicineDraft) => void;
  updateMedicine: (id: string, draft: MedicineDraft) => void;
  registerBatchEntry: (draft: BatchEntryDraft) => void;
  registerWithdrawal: (draft: WithdrawalDraft) => boolean;
  registerDisposal: (draft: DisposalDraft) => boolean;
  revertDisposal: (id: string) => void;
  addAppointment: (draft: AppointmentDraft) => void;
  confirmAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;
}

const PharmacyContext = createContext<PharmacyContextValue | null>(null);

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY_FALLBACK);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(WITHDRAWALS_FALLBACK);
  const [disposals, setDisposals] = useState<Disposal[]>(DISPOSALS_FALLBACK);
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [inv, wd, disp, appt] = await Promise.all([
          api.get<InventoryItem[]>('/inventory'),
          api.get<Withdrawal[]>('/withdrawals'),
          api.get<Disposal[]>('/disposals'),
          api.get<Appointment[]>('/appointments'),
        ]);
        if (!active) return;
        setInventory(inv.data);
        setWithdrawals(wd.data);
        setDisposals(disp.data);
        setAppointments(appt.data);
        setOffline(false);
      } catch {
        if (!active) return;
        // Backend indisponível: mantém os dados de exemplo para a interface seguir navegável.
        setOffline(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const addMedicine = useCallback((draft: MedicineDraft) => {
    setInventory((current) => [
      {
        id: String(Date.now()),
        name: draft.name,
        dosage: draft.dosage,
        category: draft.category,
        unit: draft.unit,
        minStock: draft.minStock,
        stock: draft.stock,
        expirationDate: draft.expirationDate,
        status: computeStockStatus({ stock: draft.stock, minStock: draft.minStock, expirationDate: draft.expirationDate }),
      },
      ...current,
    ]);
    toast.success('Medicamento cadastrado com sucesso.');
  }, []);

  const updateMedicine = useCallback((id: string, draft: MedicineDraft) => {
    setInventory((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...draft,
              status: computeStockStatus({
                stock: draft.stock,
                minStock: draft.minStock,
                expirationDate: draft.expirationDate,
              }),
            }
          : item
      )
    );
    toast.success('Medicamento atualizado.');
  }, []);

  const registerBatchEntry = useCallback((draft: BatchEntryDraft) => {
    setInventory((current) => {
      const existing = current.find(
        (item) => item.name.toLowerCase() === draft.medicineName.toLowerCase()
      );

      if (existing) {
        toast.success(`Entrada registrada: +${draft.quantity} ${existing.unit} de ${existing.name}.`);
        return current.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                stock: item.stock + draft.quantity,
                expirationDate: draft.expirationDate || item.expirationDate,
                status: computeStockStatus({
                  stock: item.stock + draft.quantity,
                  minStock: item.minStock,
                  expirationDate: draft.expirationDate || item.expirationDate,
                }),
              }
            : item
        );
      }

      toast.success(`Novo medicamento cadastrado a partir do lote: ${draft.medicineName}.`);
      const created: InventoryItem = {
        id: String(Date.now()),
        name: draft.medicineName,
        dosage: draft.dosage || '—',
        category: 'Outros',
        unit: 'Caixas',
        minStock: 20,
        stock: draft.quantity,
        expirationDate: draft.expirationDate,
        status: computeStockStatus({ stock: draft.quantity, minStock: 20, expirationDate: draft.expirationDate }),
      };
      return [created, ...current];
    });
  }, []);

  const registerWithdrawal = useCallback(
    (draft: WithdrawalDraft) => {
      const item = inventory.find((med) => med.id === draft.inventoryItemId);
      if (!item) return false;

      if (draft.quantity > item.stock) {
        toast.error('Quantidade maior que o saldo disponível.');
        return false;
      }

      setWithdrawals((current) => [
        {
          id: String(Date.now()),
          patientName: draft.patientName,
          cpf: draft.cpf,
          medicineName: `${item.name} ${item.dosage}`,
          quantity: draft.quantity,
          date: new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(new Date()) + ' ' + new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date()),
          dispensedBy: draft.dispensedBy,
          inventoryItemId: item.id,
          notes: draft.notes,
        },
        ...current,
      ]);

      setInventory((current) =>
        current.map((med) =>
          med.id === item.id
            ? {
                ...med,
                stock: med.stock - draft.quantity,
                status: computeStockStatus({
                  stock: med.stock - draft.quantity,
                  minStock: med.minStock,
                  expirationDate: med.expirationDate,
                }),
              }
            : med
        )
      );

      toast.success(`Retirada de ${draft.quantity} un. de ${item.name} registrada.`);
      return true;
    },
    [inventory]
  );

  const registerDisposal = useCallback(
    (draft: DisposalDraft) => {
      const item = inventory.find((med) => med.id === draft.inventoryItemId);
      if (!item) return false;

      if (draft.quantity > item.stock) {
        toast.error('Quantidade maior que o saldo disponível.');
        return false;
      }

      setDisposals((current) => [
        {
          id: String(Date.now()),
          batch: {
            id: item.id,
            code: `LOT-${item.id}`,
            medicine: { id: item.id, name: item.name, dosage: item.dosage },
            quantity: draft.quantity,
            expirationDate: item.expirationDate,
          },
          user: { id: 'u-local', name: 'Farm. Responsável', email: '' },
          reason: draft.reason,
          createdAt: new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(new Date()),
          inventoryItemId: item.id,
          reverted: false,
        },
        ...current,
      ]);

      setInventory((current) =>
        current.map((med) =>
          med.id === item.id
            ? {
                ...med,
                stock: med.stock - draft.quantity,
                status: computeStockStatus({
                  stock: med.stock - draft.quantity,
                  minStock: med.minStock,
                  expirationDate: med.expirationDate,
                }),
              }
            : med
        )
      );

      toast.success(`Descarte de ${draft.quantity} un. de ${item.name} registrado.`);
      return true;
    },
    [inventory]
  );

  const revertDisposal = useCallback(
    (id: string) => {
      const disposal = disposals.find((item) => item.id === id);
      if (!disposal || disposal.reverted || !disposal.batch) return;

      setDisposals((current) =>
        current.map((item) => (item.id === id ? { ...item, reverted: true } : item))
      );

      const targetId = disposal.inventoryItemId ?? disposal.batch.id;
      const quantity = disposal.batch.quantity;

      setInventory((current) =>
        current.map((med) =>
          med.id === targetId
            ? {
                ...med,
                stock: med.stock + quantity,
                status: computeStockStatus({
                  stock: med.stock + quantity,
                  minStock: med.minStock,
                  expirationDate: med.expirationDate,
                }),
              }
            : med
        )
      );

      toast.success(`${quantity} un. devolvidas ao estoque.`);
    },
    [disposals]
  );

  const addAppointment = useCallback((draft: AppointmentDraft) => {
    setAppointments((current) => [
      {
        id: String(Date.now()),
        patientName: draft.patientName,
        date: draft.date,
        time: draft.time,
        pharmacist: draft.pharmacist,
        type: draft.type,
        status: 'pendente',
      },
      ...current,
    ]);
    toast.success('Agendamento criado com sucesso.');
  }, []);

  const confirmAppointment = useCallback((id: string) => {
    setAppointments((current) =>
      current.map((app) => (app.id === id ? { ...app, status: 'confirmado' } : app))
    );
    toast.success('Agendamento confirmado.');
  }, []);

  const cancelAppointment = useCallback((id: string) => {
    setAppointments((current) =>
      current.map((app) => (app.id === id ? { ...app, status: 'cancelado' } : app))
    );
    toast.success('Agendamento cancelado.');
  }, []);

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
      registerBatchEntry,
      registerWithdrawal,
      registerDisposal,
      revertDisposal,
      addAppointment,
      confirmAppointment,
      cancelAppointment,
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
      registerBatchEntry,
      registerWithdrawal,
      registerDisposal,
      revertDisposal,
      addAppointment,
      confirmAppointment,
      cancelAppointment,
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
