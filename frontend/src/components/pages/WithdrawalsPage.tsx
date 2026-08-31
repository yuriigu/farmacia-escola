'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ArrowUpRight, Plus, Download, Pill, Boxes, User, Clock, Eye, Search, X, Calendar
} from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import type { WithdrawalDraft, Withdrawal } from '@/lib/types';
import { api } from '@/lib/api';
import { downloadCSV, getAvatarColor, canWriteClient } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function WithdrawalsPage() {
  const { withdrawals, batches, loading } = usePharmacyStore();
  const { user } = useAuthStore();
  const canWrite = canWriteClient(user?.role, user?.permissions, 'withdrawals');
  const canExport = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<WithdrawalDraft>({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  useEffect(() => {
    fetchBatchesData().finally(() => setLoadingBatches(false));
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const overBalance = Boolean(selectedBatch) && form.quantity > (selectedBatch?.currentQuantity ?? 0);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const patientName = w.patient?.name || '';
      const cpf = w.patient?.cpf || '';
      const medName = w.batch?.medicine?.name || '';
      const staffName = w.user?.name || '';

      return (
        !searchTerm ||
        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cpf.includes(searchTerm) ||
        medName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [withdrawals, searchTerm]);

  const handleExportCSV = () => {
    const header = ['Paciente', 'CPF', 'Medicamento', 'Dosagem', 'Quantidade', 'Dispensado por', 'Data/Hora'];
    const rows = filteredWithdrawals.map((w) => [
      w.patient?.name || 'N/A',
      w.patient?.cpf || 'N/A',
      w.batch?.medicine?.name || 'N/A',
      w.batch?.medicine?.dosage || 'N/A',
      String(w.quantity),
      w.user?.name || 'N/A',
      w.createdAt ? new Date(w.createdAt).toLocaleString('pt-BR') : '-',
    ]);
    downloadCSV('retiradas_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || overBalance || form.quantity <= 0) return;
    try {
      await api.createWithdrawal(form);
      toast.success('Retirada registrada com sucesso!');
      setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao registrar retirada.');
    }
  };

  const columns: Column<Withdrawal>[] = [
    {
      header: 'Paciente',
      width: '220px',
      cell: (w) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
              w.patient?.name || 'P'
            )}`}
          >
            {(w.patient?.name || 'P')[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
              {w.patient?.name || 'Não identificado'}
            </p>
            {w.patient?.cpf && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{w.patient.cpf}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Medicamento / Lote',
      cell: (w) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <Pill className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
              {w.batch?.medicine?.name} {w.batch?.medicine?.dosage ? <span className="text-slate-400 font-normal">({w.batch.medicine.dosage})</span> : null}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Lote: {w.batch?.code || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Quantidade',
      width: '130px',
      cell: (w) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {w.quantity} un.
        </span>
      ),
    },
    {
      header: 'Dispensado por',
      width: '160px',
      cell: (w) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{w.user?.name || 'Sistema'}</span>
        </div>
      ),
    },
    {
      header: 'Data / Hora',
      width: '160px',
      cell: (w) => {
        const date = w.createdAt ? new Date(w.createdAt) : null;
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{date ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
          </div>
        );
      },
    },
    {
      header: 'Ações',
      width: '70px',
      align: 'right',
      cell: (w) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedWithdrawal(w)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Ver comprovante e detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Retiradas de Medicamentos"
        description="Controle e registro detalhado de dispensas gratuitas realizadas aos pacientes atendidos."
        icon={ArrowUpRight}
        actions={
          <>
            {canExport && (
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredWithdrawals.length === 0}
                className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={() => {
                  setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
                  setModalOpen(true);
                }}
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Retirada</span>
              </Button>
            )}
          </>
        }
      />

      {/* Compact Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por paciente, CPF ou medicamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={filteredWithdrawals}
        isLoading={loading}
        emptyIcon={ArrowUpRight}
        emptyTitle="Nenhuma retirada registrada"
        emptyDescription="Não há retiradas correspondentes aos critérios da busca."
        emptyAction={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
                setModalOpen(true);
              }}
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Retirada
            </Button>
          ) : undefined
        }
        onRowClick={(w) => setSelectedWithdrawal(w)}
      />

      {/* Create Withdrawal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Registrar Retirada de Medicamento
            </DialogTitle>
            <DialogDescription>
              Informe o paciente e o lote para dar baixa e dispensar a medicação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Nome do Paciente *
                </Label>
                <Input
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  CPF do Paciente *
                </Label>
                <Input
                  value={form.patientCpf}
                  onChange={(e) => setForm({ ...form, patientCpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Lote de Medicamento *
              </Label>
              <Select
                value={form.batchId ? String(form.batchId) : ''}
                onValueChange={(v) => setForm({ ...form, batchId: Number(v) })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                  <SelectValue placeholder={loadingBatches ? 'Carregando lotes...' : 'Selecione um lote...'} />
                </SelectTrigger>
                <SelectContent>
                  {batches
                    .filter((b) => b.currentQuantity > 0)
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.medicine?.name} ({b.medicine?.dosage}) • Lote {b.batchNumber} - {b.currentQuantity} un.
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade a Dispensar *
              </Label>
              <Input
                type="number"
                min={1}
                max={selectedBatch?.currentQuantity}
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                placeholder="0"
                required
                className={`rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 ${
                  overBalance ? 'border-rose-500 focus:ring-rose-500' : ''
                }`}
              />
              {overBalance && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  Quantidade superior ao saldo ({selectedBatch?.currentQuantity} un.).
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Observações / Prescrição
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Número da receita, posologia ou observações..."
                rows={2}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!selectedBatch || overBalance || form.quantity <= 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Concluir Retirada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Details Dialog */}
      <Dialog open={Boolean(selectedWithdrawal)} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              Comprovante de Retirada
            </DialogTitle>
            <DialogDescription>Detalhes do atendimento e registro de dispensa</DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Paciente:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedWithdrawal.patient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">CPF:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedWithdrawal.patient?.cpf || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Medicamento:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedWithdrawal.batch?.medicine?.name} ({selectedWithdrawal.batch?.medicine?.dosage})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Lote:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedWithdrawal.batch?.code || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Quantidade:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedWithdrawal.quantity} unidades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Atendente:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedWithdrawal.user?.name || 'Sistema'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Data e Hora:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedWithdrawal.createdAt ? new Date(selectedWithdrawal.createdAt).toLocaleString('pt-BR') : '—'}
                  </span>
                </div>
              </div>

              {selectedWithdrawal.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Observações</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{selectedWithdrawal.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}