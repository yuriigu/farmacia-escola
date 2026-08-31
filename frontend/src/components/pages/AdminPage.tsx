'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Pencil, Power, User as UserIcon, Mail } from 'lucide-react';

import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import { getAvatarColor } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FARMACEUTICO',
    registerDoc: '',
    phone: '',
    active: true,
  });

  const ROLES = ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'];
  const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrador',
    FARMACEUTICO: 'Farmacêutico',
    ALUNO: 'Aluno / Estagiário',
    PACIENTE: 'Paciente',
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await load();
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

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
        await api.updateUser(Number(editing.id), payload);
        toast.success('Usuário atualizado.');
      } else {
        await api.createUser(form);
        toast.success('Usuário cadastrado.');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao salvar usuário.');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.updateUser(Number(u.id), { active: !u.active });
      toast.success(u.active ? 'Usuário desativado.' : 'Usuário ativado.');
      load();
    } catch {
      toast.error('Erro ao atualizar usuário.');
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'Nome do Usuário',
      width: '260px',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
              u.name
            )}`}
          >
            {u.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{u.name}</p>
            {u.registerDoc && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">CRF/Doc: {u.registerDoc}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'E-mail',
      cell: (u) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{u.email}</span>
        </div>
      ),
    },
    {
      header: 'Perfil de Acesso',
      width: '170px',
      cell: (u) => {
        const badgeColors =
          u.role === 'ADMIN'
            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
            : u.role === 'FARMACEUTICO'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : u.role === 'ALUNO'
            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
        return (
          <Badge variant="outline" className={`text-[10px] ${badgeColors}`}>
            {ROLE_LABEL[u.role] || u.role}
          </Badge>
        );
      },
    },
    {
      header: 'Status',
      width: '120px',
      cell: (u) => (
        <Badge
          variant="outline"
          className={
            u.active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px]'
          }
        >
          {u.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      width: '110px',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(u);
              setForm({
                name: u.name,
                email: u.email,
                password: '',
                role: u.role,
                registerDoc: u.registerDoc || '',
                phone: u.phone || '',
                active: Boolean(u.active),
              });
              setModalOpen(true);
            }}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="Editar usuário"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleActive(u)}
            className={`h-8 w-8 p-0 rounded-lg ${
              u.active
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={u.active ? 'Desativar acesso' : 'Ativar acesso'}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Gestão de Usuários e Permissões"
        description="Gerenciamento de contas, papéis de acesso e credenciais de operadores da Farmácia Escola."
        icon={ShieldCheck}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                name: '',
                email: '',
                password: '',
                role: 'FARMACEUTICO',
                registerDoc: '',
                phone: '',
                active: true,
              });
              setModalOpen(true);
            }}
            className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        }
      />

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        emptyIcon={ShieldCheck}
        emptyTitle="Nenhum usuário cadastrado"
        emptyDescription="Cadastre novos usuários com diferentes perfis de acesso."
        emptyAction={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                name: '',
                email: '',
                password: '',
                role: 'FARMACEUTICO',
                registerDoc: '',
                phone: '',
                active: true,
              });
              setModalOpen(true);
            }}
            className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Usuário
          </Button>
        }
      />

      {/* Create / Edit User Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              {editing ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Atualize as credenciais e o nível de acesso.' : 'Defina os dados e o perfil de permissão do usuário.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Nome Completo *
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Dr. Roberto Alcantara"
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                E-mail Institucional *
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@farmacia.edu.br"
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Senha {editing ? '(deixe em branco para manter)' : '*'}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '••••••••' : 'Mínimo 6 caracteres'}
                required={!editing}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Perfil de Acesso *
                </Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  CRF / Matrícula
                </Label>
                <Input
                  value={form.registerDoc}
                  onChange={(e) => setForm({ ...form, registerDoc: e.target.value })}
                  placeholder="Ex: 12345/SP"
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {editing ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}