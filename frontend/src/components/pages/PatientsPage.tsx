'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Users, Search, Plus, Pencil, Trash2, Download, Clock, ArrowUpRight, Calendar, Package, History } from 'lucide-react';
import { usePharmacyStore } from '@/lib/pharmacy-store';
import type { Patient } from '@/lib/types';
import { downloadCSV, getAvatarColor, APP_VERSION } from '@/lib/constants';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export function PatientsPage() {
  const { patients, withdrawals, appointments, disposals, medicines, batches } = usePharmacyStore();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', birthDate: '', address: '' });
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleExportCSV = () => {
    const header = ['Nome', 'CPF', 'Telefone', 'Nascimento', 'Endereco'];
    const rows = patients.map((p) => [p.name, p.cpf, p.phone || '', p.birthDate || '', p.address || '']);
    downloadCSV('pacientes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPatients(appliedSearch || undefined);
      usePharmacyStore.setState({ patients: data });
    } catch { toast.error('Erro ao carregar pacientes.'); }
    finally { setLoading(false); }
  }, [appliedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updatePatient(editing.id, form);
        toast.success('Paciente atualizado.');
      } else {
        await api.createPatient(form);
        toast.success('Paciente cadastrado.');
      }
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', cpf: '', phone: '', birthDate: '', address: '' });
      load();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao salvar paciente.');
    }
  };

  const handleDelete = async (p: Patient) => {
    setDeleteTarget(p);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePatient(deleteTarget.id);
      toast.success('Paciente excluído.');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  // Patient detail timeline data
  const patientTimeline = useMemo(() => {
    if (!selectedPatient) return [];
    const items: { type: 'withdrawal' | 'appointment' | 'disposal'; date: string; description: string; detail: string; }[] = [];

    // Withdrawals
    withdrawals
      .filter((w) => w.patient.name === selectedPatient.name)
      .forEach((w) => {
        items.push({
          type: 'withdrawal',
          date: w.createdAt,
          description: 'Retirada de medicamento',
          detail: `${w.batch.medicine.name} (${w.dosage || w.batch.medicine.dosage}) — ${w.quantity} un.`,
        });
      });

    // Appointments
    appointments
      .filter((a) => a.patient?.name === selectedPatient.name)
      .forEach((a) => {
        const d = new Date(a.scheduledDate);
        items.push({
          type: 'appointment',
          date: a.createdAt || a.scheduledDate,
          description: `Atendimento: ${a.items?.[0]?.medicine?.name || 'N/A'}`,
          detail: `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — Status: ${a.status}`,
        });
      });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [selectedPatient, withdrawals, appointments]);

  const patientWithdrawalsCount = useMemo(() => {
    if (!selectedPatient) return 0;
    return withdrawals.filter((w) => w.patient.name === selectedPatient.name).length;
  }, [selectedPatient, withdrawals]);

  const patientAppointmentsCount = useMemo(() => {
    if (!selectedPatient) return 0;
    return appointments.filter((a) => a.patient?.name === selectedPatient.name).length;
  }, [selectedPatient, appointments]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header-bar pb-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600"><Users className="w-5 h-5" /></div>
            Pacientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cadastro e gestão de pacientes • {patients.length} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={patients.length === 0} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4" />Exportar CSV
          </Button>
          <Button onClick={() => { setEditing(null); setForm({ name: '', cpf: '', phone: '', birthDate: '', address: '' }); setModalOpen(true); }} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Novo Paciente
          </Button>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setAppliedSearch(searchInput.trim()); }} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm search-input-enhanced">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <Input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Buscar por nome ou CPF..." className="border-none shadow-none focus-visible:ring-0 bg-transparent" />
        <Button type="submit" size="sm" className="rounded-lg">Buscar</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[700px]">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-sky-500">
                <tr>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">CPF</th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Nascimento</th>
                  <th className="p-4 text-center">Histórico</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center"><Skeleton className="h-6 w-full max-w-sm mx-auto" /></td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={6} className="p-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-900/10 flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-sky-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhum paciente encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">Cadastre o primeiro paciente para começar.</p>
                    </div>
                  </td></tr>
                ) : (
                  patients.map((p, idx) => {
                    const pWithdrawals = withdrawals.filter((w) => w.patient.name === p.name).length;
                    const pAppointments = appointments.filter((a) => a.patient?.name === p.name).length;
                    return (
                      <tr key={p.id} className={(idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover cursor-pointer'} onClick={() => setSelectedPatient(p)}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={'w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 avatar-gradient-' + (Math.abs([...p.name].reduce((h, c) => h + c.charCodeAt(0), 0)) % 6 + 1)}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                              {p.address && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{p.address}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{p.cpf}</td>
                        <td className="p-4">{p.phone ?? '-'}</td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 px-1.5 py-0">
                              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />{pWithdrawals}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 px-1.5 py-0">
                              <Calendar className="w-2.5 h-2.5 mr-0.5" />{pAppointments}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(p)} className="rounded-xl h-8 w-8 p-0 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20" title="Ver detalhes">
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setForm({ name: p.name, cpf: p.cpf, phone: p.phone ?? '', birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '', address: p.address ?? '' }); setModalOpen(true); }} className="rounded-xl h-8 w-8 p-0">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(p)} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/30">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Detail Dialog with Timeline */}
      <Dialog open={Boolean(selectedPatient)} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={'w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-xl avatar-gradient-' + (selectedPatient ? (Math.abs([...selectedPatient.name].reduce((h, c) => h + c.charCodeAt(0), 0)) % 6 + 1) : 1)}>
                {selectedPatient?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <p className="text-lg">{selectedPatient?.name || 'Paciente'}</p>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400">Perfil e histórico completo</p>
              </div>
            </DialogTitle>
            <DialogDescription>Informações detalhadas e histórico de atendimentos</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-5">
              {/* Patient Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPF</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 font-mono">{selectedPatient.cpf}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedPatient.phone || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nascimento</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedPatient.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedPatient.address || '—'}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{patientWithdrawalsCount}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Retiradas</p>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-center">
                  <Calendar className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{patientAppointmentsCount}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-500 font-medium">Atendimentos</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 text-center">
                  <Clock className="w-5 h-5 text-sky-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-sky-700 dark:text-sky-400">{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString('pt-BR') : '—'}</p>
                  <p className="text-[10px] text-sky-600 dark:text-sky-500 font-medium">Cadastro</p>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />Histórico Recente ({patientTimeline.length})
                </h4>
                {patientTimeline.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-center">
                    <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-400 flex items-center justify-center mx-auto mb-2">
                      <History className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">As operações aparecerão aqui automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                    {patientTimeline.map((item, i) => (
                      <div key={i} className="timeline-item pb-3">
                        <div className={'timeline-dot timeline-dot-' + item.type} />
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.description}</p>
                            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-md ' + (
                              item.type === 'withdrawal' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                              item.type === 'appointment' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400' :
                              'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                            )}>
                              {item.type === 'withdrawal' ? 'Retirada' : item.type === 'appointment' ? 'Atendimento' : 'Descarte'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.detail}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>{editing ? 'Atualize os dados do paciente.' : 'Cadastre um novo paciente.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome completo</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do paciente" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CPF</Label>
                <Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Data de nascimento</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{editing ? 'Salvar Alterações' : 'Cadastrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Excluir Paciente"
        description={"Tem certeza que deseja excluir \"" + (deleteTarget?.name || '') + "\"? Esta ação não pode ser desfeita."}
        onConfirm={confirmDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
