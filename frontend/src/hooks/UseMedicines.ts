import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Medicine } from '@/lib/types';
import { toast } from 'sonner';

export const MEDICINE_QUERY_KEYS = {
  all: ['medicines'] as const,
  detail: (id: number) => ['medicines', id] as const,
};

export function useMedicines() {
  return useQuery({
    queryKey: MEDICINE_QUERY_KEYS.all,
    queryFn: () => api.medicines.getAll(),
  });
}

export function useMedicine(id: number | null | undefined) {
  return useQuery({
    queryKey: MEDICINE_QUERY_KEYS.detail(id || 0),
    queryFn: () => api.medicines.getById(id!),
    enabled: Boolean(id && id > 0),
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      activeIngredient?: string;
      dosage?: string;
      accessibleDesc?: string;
      category?: string;
    }) => api.medicines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_QUERY_KEYS.all });
      toast.success('Medicamento cadastrado com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao cadastrar medicamento.';
      toast.error(msg);
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Medicine> }) => api.medicines.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MEDICINE_QUERY_KEYS.detail(variables.id) });
      toast.success('Medicamento atualizado com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao atualizar medicamento.';
      toast.error(msg);
    },
  });
}

export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.medicines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_QUERY_KEYS.all });
      toast.success('Medicamento excluído com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao excluir medicamento.';
      toast.error(msg);
    },
  });
}