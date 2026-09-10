// IMPORTS DE BIBLIOTECAS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// IMPORTS LOCAIS
import { api } from '@/services/api';
import type { User } from '@/lib/types';

// CHAVES DAS CONSULTAS DE USUARIOS
export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  detail: (id: number) => ['users', id] as const,
};

// HOOK PARA LISTAR USUARIOS
export function useUsers() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.all,
    queryFn: () => {
      return api.users.getAll();
    },
  });
}

// HOOK PARA CRIAR USUARIO
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User> & { password?: string; birthDate?: string; address?: string }) => {
      return api.users.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (err: any) => {
      let msg = 'Erro ao cadastrar usuário.';
      if (err) {
        if (err.response) {
          if (err.response.data) {
            if (err.response.data.error) {
              msg = err.response.data.error;
            } else if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao cadastrar usuário.';
            }
          } else if (err.message) {
            msg = err.message;
          } else {
            msg = 'Erro ao cadastrar usuário.';
          }
        } else if (err.message) {
          msg = err.message;
        } else {
          msg = 'Erro ao cadastrar usuário.';
        }
      } else {
        msg = 'Erro ao cadastrar usuário.';
      }
      toast.error(msg);
    },
  });
}

// HOOK PARA ATUALIZAR USUARIO
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<User> & { password?: string; birthDate?: string; address?: string };
    }) => {
      return api.users.update(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => {
      let msg = 'Erro ao atualizar usuário.';
      if (err) {
        if (err.response) {
          if (err.response.data) {
            if (err.response.data.error) {
              msg = err.response.data.error;
            } else if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao atualizar usuário.';
            }
          } else if (err.message) {
            msg = err.message;
          } else {
            msg = 'Erro ao atualizar usuário.';
          }
        } else if (err.message) {
          msg = err.message;
        } else {
          msg = 'Erro ao atualizar usuário.';
        }
      } else {
        msg = 'Erro ao atualizar usuário.';
      }
      toast.error(msg);
    },
  });
}

// HOOK PARA EXCLUIR USUARIO
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      return api.users.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (err: any) => {
      let msg = 'Erro ao excluir usuário.';
      if (err) {
        if (err.response) {
          if (err.response.data) {
            if (err.response.data.error) {
              msg = err.response.data.error;
            } else if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao excluir usuário.';
            }
          } else if (err.message) {
            msg = err.message;
          } else {
            msg = 'Erro ao excluir usuário.';
          }
        } else if (err.message) {
          msg = err.message;
        } else {
          msg = 'Erro ao excluir usuário.';
        }
      } else {
        msg = 'Erro ao excluir usuário.';
      }
      toast.error(msg);
    },
  });
}