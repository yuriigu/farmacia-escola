import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { User } from '@/lib/types';
import { toast } from 'sonner';

export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  detail: (id: number) => ['users', id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.all,
    queryFn: () => api.users.getAll(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User> & { password?: string; birthDate?: string; address?: string }) =>
      api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao cadastrar usuário.';
      toast.error(msg);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<User> & { password?: string; birthDate?: string; address?: string };
    }) => api.users.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao atualizar usuário.';
      toast.error(msg);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao excluir usuário.';
      toast.error(msg);
    },
  });
}