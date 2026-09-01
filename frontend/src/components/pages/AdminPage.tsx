'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Plus,
  Pencil,
  Power,
  Trash2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Search,
  KeyRound,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';

import type { User } from '@/lib/types';
import { getAvatarColor } from '@/lib/constants';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/UseUsers';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ROLES = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'] as const;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacêutico',
  MEDICO: 'Médico',
  ALUNO: 'Aluno / Estagiário',
  PACIENTE: 'Paciente',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
  FARMACEUTICO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  MEDICO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
  ALUNO: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400',
  PACIENTE: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  registerDoc: string;
  phone: string;
  birthDate: string;
  address: string;
  active: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'FARMACEUTICO',
  registerDoc: '',
  phone: '',
  birthDate: '',
  address: '',
  active: true,
};

export function AdminPage() {
  const { data: users = [], isLoading, refetch } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(initialFormData);
  const [changePassword, setChangePassword] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Helper for document placeholder & label based on selected role
  const getDocInfo = (role: string) => {
    switch (role) {
      case 'PACIENTE':
        return { label: 'CPF', placeholder: '000.000.000-00', helper: 'CPF do paciente' };
      case 'FARMACEUTICO':
        return { label: 'CRF / Registro Profissional', placeholder: 'CRF-SP 12345', helper: 'Número do CRF com estado' };
      case 'MEDICO':
        return { label: 'CRM / Registro Médico', placeholder: 'CRM-SP 123456', helper: 'Número do CRM com estado' };
      case 'ALUNO':
        return { label: 'Matrícula Acadêmica', placeholder: 'Ex: 20240192', helper: 'Matrícula da faculdade' };
      case 'ADMIN':
      default:
        return { label: 'Identificador / Matrícula / CPF', placeholder: 'Ex: ADM-1029 ou CPF', helper: 'Documento ou matrícula' };
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setForm(initialFormData);
    setChangePassword(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    const userBirthDate = u.birthDate
      ? u.birthDate.split('T')[0]
      : u.patient?.birthDate
      ? String(u.patient.birthDate).split('T')[0]
      : '';
    const userAddress = u.address || u.patient?.address || '';
    const userDoc = u.registerDoc || u.patient?.cpf || '';
    const userPhone = u.phone || u.patient?.phone || '';

    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'FARMACEUTICO',
      registerDoc: userDoc,
      phone: userPhone,
      birthDate: userBirthDate,
      address: userAddress,
      active: u.active ?? true,
    });
    setChangePassword(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome completo.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Informe o e-mail.');
      return;
    }
    if (!editingUser && (!form.password || form.password.length < 6)) {
      toast.error('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (editingUser && changePassword && form.password && form.password.length < 6) {
      toast.error('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }

    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          registerDoc: form.registerDoc.trim() || null,
          phone: form.phone.trim() || null,
          birthDate: form.birthDate || null,
          address: form.address.trim() || null,
          active: form.active,
        };
        if (changePassword && form.password.trim()) {
          payload.password = form.password;
        }

        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: payload,
        });
      } else {
        await createUserMutation.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          registerDoc: form.registerDoc.trim() || undefined,
          phone: form.phone.trim() || undefined,
          birthDate: form.birthDate || undefined,
          address: form.address.trim() || undefined,
          active: form.active,
        });
      }

      setModalOpen(false);
      setEditingUser(null);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await updateUserMutation.mutateAsync({
        id: u.id,
        data: { active: !u.active },
      });
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        search.trim() === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.registerDoc && u.registerDoc.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search)) ||
        (u.address && u.address.toLowerCase().includes(search.toLowerCase()));

      const matchRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

      return matchSearch && matchRole;
    });
  }, [users, search, selectedRoleFilter]);

  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  const columns: Column<User>[] = [
    {
      header: 'Usuário',
      width: '260px',
      cell: (u) => {
        const doc = u.registerDoc || u.patient?.cpf;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${getAvatarColor(
                u.name
              )}`}
            >
              {u.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{u.name}</p>
              {doc ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <FileText className="w-3 h-3 shrink-0 text-slate-400" />
                  <span>{doc}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Sem documento</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contato',
      width: '240px',
      cell: (u) => {
        const phone = u.phone || u.patient?.phone;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{u.email}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Perfil',
      width: '160px',
      cell: (u) => {
        const badgeStyle = ROLE_BADGE_STYLES[u.role] || 'bg-slate-100 text-slate-700 border-slate-200';
        return (
          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 ${badgeStyle}`}>
            {ROLE_LABEL[u.role] || u.role}
          </Badge>
        );
      },
    },
    {
      header: 'Dados Adicionais',
      cell: (u) => {
        const birthDate = u.birthDate || u.patient?.birthDate;
        const address = u.address || u.patient?.address;
        const formattedDate = birthDate ? new Date(birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null;

        return (
          <div className="text-xs space-y-1 max-w-xs">
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Nascimento: {formattedDate}</span>
              </div>
            )}
            {address ? (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]" title={address}>
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{address}</span>
              </div>
            ) : (
              !formattedDate && <span className="text-slate-400 text-[11px] italic">Sem endereço/nascimento</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '110px',
      cell: (u) => (
        <Badge
          variant="outline"
          className={`text-[11px] font-semibold px-2 py-0.5 ${
            u.active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {u.active ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Inativo
            </span>
          )}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      width: '130px',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEdit(u)}
            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/40"
            title="Editar dados completos do usuário"
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleActive(u)}
            className={`h-8 w-8 p-0 rounded-lg ${
              u.active
                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
            title={u.active ? 'Desativar usuário' : 'Ativar usuário'}
          >
            <Power className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setUserToDelete(u);
              setDeleteConfirmOpen(true);
            }}
            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title="Excluir usuário"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const docInfo = getDocInfo(form.role);

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* Header with quick stats */}
      <PageHeader
        title="Administração e Usuários"
        description="Gestão centralizada de contas de acesso, perfis de operadores e registros da Farmácia Escola."
        icon={ShieldCheck}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Usuários</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Contas Ativas</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Administradores</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {users.filter((u) => u.role === 'ADMIN').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Farmacêuticos & Equipe</p>
          <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-1">
            {users.filter((u) => u.role === 'FARMACEUTICO' || u.role === 'MEDICO' || u.role === 'ALUNO').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, email ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Filtrar por Perfil:</span>
          <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm h-10">
              <SelectValue placeholder="Todos os Perfis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Perfis</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        emptyIcon={ShieldCheck}
        emptyTitle="Nenhum usuário encontrado"
        emptyDescription={search || selectedRoleFilter !== 'ALL' ? 'Tente ajustar os filtros de busca.' : 'Cadastre um novo usuário para iniciar.'}
        emptyAction={
          <Button
            onClick={handleOpenCreate}
            className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Usuário
          </Button>
        }
      />

      {/* Comprehensive User Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editingUser ? 'Editar Usuário' : 'Novo Cadastro de Usuário'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {editingUser
                    ? 'Atualize os dados pessoais, permissões e credenciais de acesso.'
                    : 'Preencha os campos abaixo para criar um novo usuário no sistema.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Grid 1: Nome Completo & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome Completo <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Dra. Juliana Santos"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10"
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  E-mail <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@farmacia.edu.br"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10"
                />
              </div>
            </div>

            {/* Grid 2: Tipo/Perfil & Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tipo / Perfil de Usuário <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_LABEL[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {docInfo.label}
                </Label>
                <Input
                  value={form.registerDoc}
                  onChange={(e) => setForm({ ...form, registerDoc: e.target.value })}
                  placeholder={docInfo.placeholder}
                  className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10"
                />
                <p className="text-[10px] text-slate-400 mt-1">{docInfo.helper}</p>
              </div>
            </div>

            {/* Grid 3: Telefone & Data de Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Telefone / WhatsApp
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10"
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Data de Nascimento
                </Label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 h-10"
                />
              </div>
            </div>

            {/* Endereço Completo */}
            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Endereço Completo
              </Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                rows={2}
                className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm resize-none"
              />
            </div>

            {/* Password Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{editingUser ? 'Redefinição de Senha' : 'Senha de Acesso *'}</span>
                </div>
                {editingUser && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChangePassword(!changePassword);
                      if (changePassword) setForm({ ...form, password: '' });
                    }}
                    className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    {changePassword ? 'Cancelar Alteração' : 'Alterar Senha'}
                  </Button>
                )}
              </div>

              {(!editingUser || changePassword) && (
                <div className="space-y-1.5 pt-1">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? 'Digite a nova senha (mínimo 6 caracteres)' : 'Senha (mínimo 6 caracteres)'}
                    required={!editingUser || changePassword}
                    className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 h-10"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingUser
                      ? 'Preencha este campo apenas se desejar redefinir a senha do usuário.'
                      : 'A senha será usada para autenticação no portal.'}
                  </p>
                </div>
              )}
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Status da Conta</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {form.active ? 'Usuário ativo e autorizado a acessar o sistema.' : 'Usuário bloqueado/inativo.'}
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                {createUserMutation.isPending || updateUserMutation.isPending
                  ? 'Salvando...'
                  : editingUser
                  ? 'Salvar Alterações'
                  : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Excluir Usuário?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.name}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              {deleteUserMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}