'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Users, Search, Plus, Pencil, Trash2, Download, Clock, ArrowUpRight, Calendar, Eye, X
} from 'lucide-react';
import { usePharmacyStore } from '@/lib/pharmacy-store';
import type { Patient } from '@/lib/types';
import { downloadCSV, getAvatarColor } from '@/lib/constants';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function PatientsPage() {
  const { patients, withdrawals, appointments } = usePharmacyStore();
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
    toast.success('Relatório exportado com sucesso!');
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPatients(appliedSearch || undefined);
      usePharmacyStore.setState({ patients: data });
    } catch {
      toast.error('Erro ao carregar pacientes.');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

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

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      name: p.name,
      cpf: p.cpf,
      phone: p.phone || '',
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
      address: p.address || '',
    });
    setModalOpen(true);
  };

  const patientTimeline = useMemo(() => {
    if (!selectedPatient) return [];
    const items: { type: 'withdrawal' | 'appointment'; date: string; description: string; detail: string }[] = [];

    withdrawals
      .filter((w) => w.patient.name === selectedPatient.name)
      .forEach((w) => {
        items.push({
          type: 'withdrawal',
          date: w.createdAt,
          description: 'Retirada de medicamento',
          detail: `${w.batch.medicine.name} (${w.batch.medicine.dosage || 'Dose não informada'}) — ${w.quantity} un.`,
        });
      });

    appointments
      .filter((a) => a.patient?.name === selectedPatient.name)
      .forEach((a) => {
        const d = new Date(a.scheduledDate);
        items.push({
          type: 'appointment',
          date: a.createdAt || a.scheduledDate,
          description: `Atendimento: ${a.items?.[0]?.medicine?.name || 'N/A'}`,
          detail: `${d.toLocaleDateString('pt-BR')} ${a.scheduledTime || ''} — Status: ${a.status}`,
        });
      });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [selectedPatient, withdrawals, appointments]);

  const columns: Column<Patient>[] = [
    {
      header: 'Paciente',
      width: '260px',
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
              p.name
            )}`}
          >
            {p.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
              {p.name}
            </p>
            {p.address && (
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">{p.address}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'CPF',
      width: '140px',
      cell: (p) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{p.cpf}</span>
      ),
    },
    {
      header: 'Telefone',
      width: '140px',
      cell: (p) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{p.phone || '—'}</span>
      ),
    },
    {
      header: 'Data de Nascimento',
      width: '140px',
      cell: (p) => {
        const d = p.birthDate ? new Date(p.birthDate) : null;
        return (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—'}
          </span>
        );
      },
    },
    {
      header: 'Histórico',
      width: '130px',
      align: 'center',
      cell: (p) => {
        const pWithdrawals = withdrawals.filter((w) => w.patient.name === p.name).length;
        const pAppointments = appointments.filter((a) => a.patient?.name === p.name).length;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 px-1.5 py-0"
              title={`${pWithdrawals} retiradas`}
            >
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
              {pWithdrawals}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 px-1.5 py-0"
              title={`${pAppointments} agendamentos`}
            >
              <Calendar className="w-2.5 h-2.5 mr-0.5" />
              {pAppointments}
            </Badge>
          </div>
        );
      },
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedPatient(p)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Ver prontuário do paciente"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(p)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="Editar paciente"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteTarget(p)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Excluir paciente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Cadastro de Pacientes"
        description="Gestão de pacientes atendidos, histórico clínico de dispensas e agendamentos."
        icon={Users}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={patients.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ name: '', cpf: '', phone: '', birthDate: '', address: '' });
                setModalOpen(true);
              }}
              className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Paciente</span>
            </Button>
          </>
        }
      />

      {/* Compact Filters Toolbar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedSearch(searchInput.trim());
        }}
        className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar paciente por nome ou CPF..."
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" className="h-9 px-4 rounded-xl text-xs bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600">
          Buscar
        </Button>
      </form>

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={patients}
        isLoading={loading}
        emptyIcon={Users}
        emptyTitle="Nenhum paciente encontrado"
        emptyDescription="Cadastre o primeiro paciente para iniciar o acompanhamento."
        emptyAction={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: '', cpf: '', phone: '', birthDate: '', address: '' });
              setModalOpen(true);
            }}
            className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Paciente
          </Button>
        }
        onRowClick={(p) => setSelectedPatient(p)}
      />

      {/* Create / Edit Patient Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Users className="w-5 h-5 text-emerald-600" />
              {editing ? 'Editar Paciente' : 'Novo Paciente'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Atualize os dados cadastrais do paciente.' : 'Preencha os dados do paciente para novo cadastro.'}
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
                placeholder="Ex: Maria Aparecida da Silva"
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  CPF *
                </Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Telefone
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Data de Nascimento
              </Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Endereço
              </Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade..."
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {editing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Patient Detail / Prontuário Dialog */}
      <Dialog open={Boolean(selectedPatient)} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="rounded-2xl max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(
                  selectedPatient?.name || 'P'
                )}`}
              >
                {selectedPatient?.name[0]?.toUpperCase()}
              </div>
              {selectedPatient?.name}
            </DialogTitle>
            <DialogDescription>Prontuário e histórico de atendimentos na Farmácia Escola</DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400">CPF:</span>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPatient.cpf}</p>
                </div>
                <div>
                  <span className="text-slate-400">Telefone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPatient.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Nascimento:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPatient.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Endereço:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{selectedPatient.address || '—'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Histórico de Atendimentos ({patientTimeline.length})
                </h4>
                {patientTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Nenhum atendimento ou retirada registrado para este paciente.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientTimeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.description}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={item.type === 'withdrawal' ? 'text-emerald-600 border-emerald-200 text-[10px]' : 'text-teal-600 border-teal-200 text-[10px]'}
                        >
                          {item.type === 'withdrawal' ? 'Retirada' : 'Agendamento'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Patient Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Paciente"
        description={`Tem certeza que deseja excluir o cadastro de "${deleteTarget?.name}"? Esta ação removerá os dados permanentemente.`}
        onConfirm={confirmDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}