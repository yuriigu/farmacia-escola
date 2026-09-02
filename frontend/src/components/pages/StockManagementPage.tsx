'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Boxes, Plus, Search, Pencil, Trash2, Eye, X, Calendar, Download
} from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import { computeStockStatus, type BatchEntryDraft, type Batch, type StockStatus } from '@/lib/types';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { api } from '@/lib/api';
import { canWriteClient, downloadCSV } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function StockManagementPage() {
  const { medicines, batches, withdrawals, disposals, loading } = usePharmacyStore();
  const { user } = useAuthStore();
  const canWrite = canWriteClient(user?.role, user?.permissions, 'batches');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BatchEntryDraft>({ medicineId: 0, batchNumber: '', currentQuantity: 0, expirationDate: '' });
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ batchNumber: '', currentQuantity: 0, expirationDate: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchBatchesData();
  }, []);

  const getBatchStatus = (batch: Batch): StockStatus => {
    return computeStockStatus({
      expirationDate: batch.expirationDate,
      totalQuantity: batch.currentQuantity,
    });
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        !batchSearch ||
        b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
        (b.medicine?.name && b.medicine.name.toLowerCase().includes(batchSearch.toLowerCase()));
      const status = getBatchStatus(b);
      const matchesStatus = batchStatusFilter === 'all' || status === batchStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [batches, batchSearch, batchStatusFilter]);

  const batchWithdrawals = useMemo(() => {
    if (!selectedBatch) return [];
    return withdrawals.filter((w) => w.batch?.id === selectedBatch.id);
  }, [selectedBatch, withdrawals]);

  const batchDisposals = useMemo(() => {
    if (!selectedBatch) return [];
    return disposals.filter((d) => d.batch?.id === selectedBatch.id);
  }, [selectedBatch, disposals]);

  const batchHistory = useMemo(() => {
    const items: { type: 'withdrawal' | 'disposal'; date: string; description: string; userName: string; quantity: number }[] = [];
    batchWithdrawals.forEach((w) => {
      items.push({
        type: 'withdrawal',
        date: w.createdAt,
        description: `Retirada: ${w.patient?.name || 'Paciente'} (${w.quantity} un.)`,
        userName: w.user?.name || 'Sistema',
        quantity: w.quantity,
      });
    });
    batchDisposals.forEach((d) => {
      items.push({
        type: 'disposal',
        date: d.createdAt,
        description: `Descarte: ${d.reason} (${d.quantity} un.)`,
        userName: d.user?.name || 'Sistema',
        quantity: d.quantity,
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batchWithdrawals, batchDisposals]);

  const handleExportCSV = () => {
    const header = ['Número do Lote', 'Medicamento', 'Dosagem', 'Quantidade', 'Data de Validade', 'Status'];
    const rows = filteredBatches.map((b) => {
      const status = getBatchStatus(b);
      const statusLabel =
        status === 'ok' ? 'Em dia' : status === 'low' ? 'Baixo' : status === 'critical' ? 'Crítico' : 'Vencido';
      return [
        b.batchNumber,
        b.medicine?.name || 'N/A',
        b.medicine?.dosage || 'N/A',
        String(b.currentQuantity),
        b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('pt-BR') : '-',
        statusLabel,
      ];
    });
    downloadCSV('estoque_lotes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório de lotes exportado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineId || !form.batchNumber || !form.currentQuantity || !form.expirationDate) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await api.createBatch(form);
      toast.success('Lote registrado com sucesso no estoque!');
      setForm({ medicineId: 0, batchNumber: '', currentQuantity: 0, expirationDate: '' });
      setCreateOpen(false);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao registrar lote.');
    }
  };

  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setEditForm({
      batchNumber: batch.batchNumber,
      currentQuantity: batch.currentQuantity,
      expirationDate: batch.expirationDate.slice(0, 10),
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setEditLoading(true);
    try {
      await api.updateBatch(selectedBatch.id, editForm);
      toast.success('Lote atualizado com sucesso!');
      setEditOpen(false);
      setSelectedBatch(null);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao atualizar lote.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;
    setDeleteLoading(true);
    try {
      await api.deleteBatch(selectedBatch.id);
      toast.success('Lote excluído com sucesso!');
      setDeleteOpen(false);
      setSelectedBatch(null);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Não é possível excluir: o lote possui movimentações associadas.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Batch>[] = [
    {
      header: 'Número do Lote',
      width: '180px',
      cell: (batch) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-mono leading-tight">
              {batch.batchNumber}
            </p>
            <p className="text-[10px] text-slate-400">ID #{batch.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Medicamento',
      cell: (batch) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {batch.medicine?.name || 'Medicamento não identificado'}
          </p>
          {batch.medicine?.dosage && (
            <p className="text-[11px] text-slate-400 mt-0.5">{batch.medicine.dosage}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Quantidade',
      width: '130px',
      cell: (batch) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {batch.currentQuantity} un.
        </span>
      ),
    },
    {
      header: 'Validade',
      width: '140px',
      cell: (batch) => {
        const exp = new Date(batch.expirationDate);
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {Number.isNaN(exp.getTime()) ? '—' : exp.toLocaleDateString('pt-BR')}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '140px',
      cell: (batch) => {
        const status = getBatchStatus(batch);
        return <StockStatusBadge status={status} />;
      },
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right',
      cell: (batch) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedBatch(batch)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Visualizar histórico e detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canWrite && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEditDialog(batch)}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                title="Editar lote"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedBatch(batch);
                  setDeleteOpen(true);
                }}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Excluir lote"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Entrada e Gestão de Lotes"
        description="Cadastre novas remessas de medicamentos, acompanhe validades e audite o saldo em estoque."
        icon={Boxes}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredBatches.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>
            {canWrite && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Lote</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Compact Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por lote ou medicamento..."
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
          {batchSearch && (
            <button
              onClick={() => setBatchSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'all', label: 'Todos os Lotes' },
            { id: 'ok', label: 'Em Dia' },
            { id: 'low', label: 'Baixo' },
            { id: 'critical', label: 'Crítico' },
            { id: 'expired', label: 'Vencidos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBatchStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                batchStatusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={filteredBatches}
        isLoading={loading}
        emptyIcon={Boxes}
        emptyTitle="Nenhum lote encontrado"
        emptyDescription="Tente ajustar a busca ou cadastre uma nova remessa de lote."
        emptyAction={
          canWrite ? (
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Lote
            </Button>
          ) : undefined
        }
        onRowClick={(b) => setSelectedBatch(b)}
      />

      {/* Create Batch Dialog (MD) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Boxes className="w-5 h-5 text-emerald-600" />
              Entrada de Novo Lote
            </DialogTitle>
            <DialogDescription>
              Cadastre uma nova remessa de medicamentos recebida no estoque.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Medicamento *
              </Label>
              <Select
                value={form.medicineId ? String(form.medicineId) : ''}
                onValueChange={(v) => setForm({ ...form, medicineId: Number(v) })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                  <SelectValue placeholder="Selecione um medicamento..." />
                </SelectTrigger>
                <SelectContent>
                  {medicines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} {m.dosage ? `(${m.dosage})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Número do Lote *
                </Label>
                <Input
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="Ex: LOT-2026-08A"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Quantidade Recebida *
                </Label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={form.currentQuantity || ''}
                  onChange={(e) => setForm({ ...form, currentQuantity: Number(e.target.value) })}
                  placeholder="Ex: 100"
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Data de Validade *
              </Label>
              <Input
                type="date"
                required
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Registrar Lote
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Details / History Dialog (LG) */}
      <Dialog open={Boolean(selectedBatch && !editOpen && !deleteOpen)} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="rounded-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                  <Boxes className="w-5 h-5" />
                </div>
                Lote {selectedBatch?.batchNumber}
              </DialogTitle>
              {canWrite && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedBatch && openEditDialog(selectedBatch)}
                    className="rounded-xl gap-1.5 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-xl gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>Informações do lote e histórico de movimentações</DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicamento</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedBatch.medicine?.name} {selectedBatch.medicine?.dosage}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade Atual</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {selectedBatch.currentQuantity} unidades
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Validade</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {new Date(selectedBatch.expirationDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status do Estoque</p>
                  <div className="mt-1">
                    <StockStatusBadge status={getBatchStatus(selectedBatch)} />
                  </div>
                </div>
              </div>

              {/* History */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Histórico de Movimentações ({batchHistory.length})
                </h4>
                {batchHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Nenhuma movimentação registrada para este lote.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {batchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{item.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Operador: {item.userName} • {new Date(item.date).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={item.type === 'withdrawal' ? 'text-teal-600 border-teal-200' : 'text-amber-600 border-amber-200'}
                        >
                          {item.type === 'withdrawal' ? 'Retirada' : 'Descarte'}
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

      {/* Edit Batch Dialog (MD) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Lote</DialogTitle>
            <DialogDescription>Atualize os dados do lote cadastrado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Número do Lote
              </Label>
              <Input
                value={editForm.batchNumber}
                onChange={(e) => setEditForm({ ...editForm, batchNumber: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade em Estoque
              </Label>
              <Input
                type="number"
                min={0}
                value={editForm.currentQuantity}
                onChange={(e) => setEditForm({ ...editForm, currentQuantity: Number(e.target.value) })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Data de Validade
              </Label>
              <Input
                type="date"
                value={editForm.expirationDate}
                onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {editLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog (SM) */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Lote"
        description={`Tem certeza que deseja excluir o lote "${selectedBatch?.batchNumber}"? Se o lote possuir retiradas ou descartes vinculados, a exclusão será bloqueada.`}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}