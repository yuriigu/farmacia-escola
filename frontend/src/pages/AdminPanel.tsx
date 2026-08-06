import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, fieldClass, labelClass } from '@/components/Modal';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

const ROLES = ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacêutico',
  ALUNO: 'Aluno',
  PACIENTE: 'Paciente',
};

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  registerDoc: string;
  phone: string;
  active: boolean;
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'FARMACEUTICO',
  registerDoc: '',
  phone: '',
  active: true,
};

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<User[]>('/users');
      setUsers(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role ?? 'FARMACEUTICO',
      registerDoc: user.registerDoc ?? '',
      phone: user.phone ?? '',
      active: user.active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
          registerDoc: form.registerDoc,
          phone: form.phone,
          active: form.active,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
        toast.success('Usuário atualizado com sucesso.');
      } else {
        await api.post('/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          registerDoc: form.registerDoc,
          phone: form.phone,
        });
        toast.success('Usuário cadastrado com sucesso.');
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar usuário.');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, { active: !user.active });
      toast.success(user.active ? 'Usuário desativado.' : 'Usuário ativado.');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar usuário.');
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Desativar o usuário "${user.name}"?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuário desativado.');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao desativar usuário.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Painel Administrativo — Usuários
          </h1>
          <p className="text-sm text-slate-500">Gestão de perfis e acesso ao sistema (somente ADMIN)</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Registro</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{u.name}</td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {ROLE_LABEL[u.role ?? ''] ?? u.role}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500">{u.registerDoc ?? '—'}</td>
                  <td className="p-4">
                    {u.active !== false ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(u)}
                      title="Editar"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      title={u.active !== false ? 'Desativar' : 'Ativar'}
                      className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      title="Desativar"
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title={editing ? 'Editar Usuário' : 'Novo Usuário'}
              description={editing ? 'Atualize os dados do usuário.' : 'Cadastre um novo usuário no sistema.'}
            >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelClass}>Nome completo</label>
            <input
              required
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          <div>
            <label className={labelClass}>E-mail</label>
            <input
              required
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@email.com"
            />
          </div>

          <div>
            <label className={labelClass}>Senha {editing && <span className="text-slate-400 font-normal">(deixe em branco para manter)</span>}</label>
            <input
              type="password"
              className={fieldClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? 'Nova senha (opcional)' : 'Senha'}
              required={!editing}
              minLength={!editing ? 6 : undefined}
            />
          </div>

          <div>
            <label className={labelClass}>Perfil</label>
            <select
              className={fieldClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Documento / Registro</label>
              <input
                className={fieldClass}
                value={form.registerDoc}
                onChange={(e) => setForm({ ...form, registerDoc: e.target.value })}
                placeholder="CRF / RA"
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {editing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="user-active"
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <label htmlFor="user-active" className="text-sm font-medium text-slate-700">
                Usuário ativo
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

