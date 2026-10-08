// imports de bibliotecas
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-handler';

// imports locais
import { api } from '@/services/api';
import type { User } from '@/types';

// chaves das consultas de usuarios. ficam centralizadas aqui pra
// todo mundo (listar, criar, atualizar, excluir) invalidar as
// mesmas chaves. se alguem consumir esses hooks em outra tela,
// basta usar as mesmas constantes.
export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  detail: (id: number) => ['users', id] as const,
};

// hook que lista usuarios. usa o react-query pra cachear e
// revalidar a lista. a tela de admin consome esse hook pra
// montar a tabela.
export function useUsers(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.all,
    queryFn: () => {
      // aqui chamamos o cliente http (/services/api) pra buscar
      // a lista de usuarios no backend.
      return api.users.getAll();
    },
    enabled: options.enabled ?? true,
  });
}

// hook que cria usuario. em caso de sucesso, invalida a lista
// pra ela recarregar com o novo usuario. em caso de erro, tenta
// extrair a mensagem da api (priorizando err.response.data.error)
// e mostra via toast.
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User> & { password?: string; birthDate?: string; address?: string }) => {
      // aqui chamamos o cliente http (/services/api) pra criar o
      // usuario no backend.
      return api.users.create(data);
    },
    onSuccess: () => {
      // invalida a lista pra trazer o novo usuario em seguida.
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (err: any) => {
      // cascata de fallback pra pegar a melhor mensagem possivel:
      // 1) err.response.data.error (erro de negocio da api)
      // 2) err.message (mensagem da biblioteca/rede)
      // 3) mensagem generica
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

// hook que atualiza usuario. invalida a lista E o detalhe do
// usuario afetado, porque ambos podem ter mudado (ex: mudanca de
// nome reflete nos dois lugares). o id vem das variaveis da
// mutation (segundo argumento do onsuccess).
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
      // aqui chamamos o cliente http (/services/api) pra atualizar.
      return api.users.update(id, data);
    },
    onSuccess: (_, variables) => {
      // invalida a lista e o detalhe do usuario afetado.
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => {
      // mesma cascata de fallback dos outros hooks pra extrair
      // a melhor mensagem de erro.
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

// hook que exclui usuario. invalida a lista apos o sucesso.
// erros de negocio (ex: ultimo admin ativo, auto-exclusao) vem
// da api e viram toast.
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      // aqui chamamos o cliente http (/services/api) pra excluir.
      return api.users.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (err: any) => {
      // mesma cascata de fallback pra extrair a melhor mensagem.
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