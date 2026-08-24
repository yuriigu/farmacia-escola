'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Pencil, Power } from 'lucide-react';

import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FARMACEUTICO', registerDoc: '', phone: '', active: true });

  const ROLES = ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'];
  const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrador', FARMACEUTICO: 'Farmacêutico', ALUNO: 'Aluno', PACIENTE: 'Paciente' };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch { toast.error('Erro ao carregar usuários.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await load();
    })();
    return () => { mounted = false; };
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, registerDoc: form.registerDoc, phone: form.phone, active: form.active };
        if (form.password) payload.password = form.password;
        await api.updateUser(Number(editing.id), payload);
        toast.success('Usuário atualizado.');
      } else {
        await api.createUser(form);
        toast.success('Usuário cadastrado.');
      }
      setModalOpen(false); setEditing(null); load();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao salvar usuário.');
    }
  };

  const handleToggleActive = async (u: User) => {
    try { await api.updateUser(Number(u.id), { active: !u.active }); toast.success(u.active ? 'Usuário desativado.' : 'Usuário ativado.'); load(); }
    catch { toast.error('Erro ao atualizar usuário.'); }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />Painel Administrativo — Usuários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestão de perfis e acesso (somente ADMIN)</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'FARMACEUTICO', registerDoc: '', phone: '', active: true }); setModalOpen(true); }} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
          <Plus className="w-4 h-4" />Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[640px]">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Perfil</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-6 w-full max-w-sm mx-auto" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="p-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-10 h-10 text-emerald-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhum usuário encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">Adicione usuários ao sistema.</p>
                    </div>
                  </td></tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={String(u.id)} className={(idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover'}>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{u.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {u.active !== false ? (
                          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800">Inativo</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role ?? 'FARMACEUTICO', registerDoc: u.registerDoc ?? '', phone: u.phone ?? '', active: u.active ?? true }); setModalOpen(true); }} className="rounded-xl h-8 w-8 p-0">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u)} className="rounded-xl h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                          <Power className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>{editing ? 'Atualize os dados.' : 'Cadastre um novo usuário.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Nome</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">E-mail</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Senha {editing && <span className="text-slate-400 dark:text-slate-500 font-normal">(deixe vazio para manter)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={!editing ? 6 : undefined} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (<SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Registro</Label>
                <Input value={form.registerDoc} onChange={(e) => setForm({ ...form, registerDoc: e.target.value })} placeholder="CRF / RA" className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="user-active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
                <Label htmlFor="user-active" className="text-sm font-medium text-slate-700 dark:text-slate-200">Usuário ativo</Label>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{editing ? 'Salvar Alterações' : 'Cadastrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
