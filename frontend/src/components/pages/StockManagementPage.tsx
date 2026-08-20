'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Boxes, ArrowUpRight, Plus, Search, History, Package, Pencil, Trash2, Loader2 } from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import type { BatchEntryDraft, Batch } from '@/lib/types';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { api } from '@/lib/api';
import { canWriteClient } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function StockManagementPage() {
  const { medicines, batches, withdrawals, disposals } = usePharmacyStore();
  const { user } = useAuthStore();
  const canWrite = canWriteClient(user?.role, user?.permissions, 'batches');
  const [form, setForm] = useState<BatchEntryDraft>({ medicineId: 0, batchNumber: '', currentQuantity: 0, expirationDate: '' });
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ batchNumber: '', currentQuantity: 0, expirationDate: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchBatchesData(); }, [fetchBatchesData]);

  const now = new Date();
  const getBatchStatus = (expDate: string, qty: number) => {
    const exp = new Date(expDate);
    if (qty <= 0) return 'empty';
    if (exp < now) return 'expired';
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 30) return 'expiring';
    return 'ok';
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch = !batchSearch || b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) || b.medicine?.name.toLowerCase().includes(batchSearch.toLowerCase());
    const status = getBatchStatus(b.expirationDate, b.currentQuantity);
    const matchesStatus = batchStatusFilter === 'all' || status === batchStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const batchWithdrawals = useMemo(() => {
    if (!selectedBatch) return [];
    return withdrawals.filter((w) => w.batch.id === selectedBatch.id);
  }, [selectedBatch, withdrawals]);

  const batchDisposals = useMemo(() => {
    if (!selectedBatch) return [];
    return disposals.filter((d) => d.batch.id === selectedBatch.id);
  }, [selectedBatch, disposals]);

  const batchHistory = useMemo(() => {
    const items: { type: 'withdrawal' | 'disposal'; date: string; description: string; userName: string; quantity: number }[] = [];
    batchWithdrawals.forEach((w) => {
      items.push({
        type: 'withdrawal',
        date: w.createdAt,
        description: 'Retirada: ' + w.patient.name + ' (' + w.quantity + ' un.)',
        userName: w.user.name,
        quantity: w.quantity,
      });
    });
    batchDisposals.forEach((d) => {
      items.push({
        type: 'disposal',
        date: d.createdAt,
        description: 'Descarte: ' + d.reason + ' (' + d.quantity + ' un.)',
        userName: d.user.name,
        quantity: d.quantity,
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batchWithdrawals, batchDisposals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineId || !form.batchNumber || !form.currentQuantity || !form.expirationDate) return;
    try {
      await api.createBatch(form);
      toast.success('Lote registrado com sucesso!');
      setForm({ medicineId: 0, batchNumber: '', currentQuantity: 0, expirationDate: '' });
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao registrar lote.');
    }
  };

  const openEditDialog = (batch: Batch) => {
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

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-emerald-600" />Entrada de Lotes e Controle de Estoque
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cadastre novas remessas de medicamentos</p>
      </div>

      {canWrite && (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />Formulário de Entrada de Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Medicamento</Label>
                <Select value={form.medicineId ? String(form.medicineId) : ''} onValueChange={(v) => setForm({ ...form, medicineId: Number(v) })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"><SelectValue placeholder="Selecione um medicamento..." /></SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name} {m.dosage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Número do Lote</Label>
                <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="Ex: LOT-2026-08A" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Quantidade Recebida</Label>
                <Input type="number" min={1} required value={form.currentQuantity || ''} onChange={(e) => setForm({ ...form, currentQuantity: Number(e.target.value) })} placeholder="0" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Data de Validade</Label>
                <Input type="date" required value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 active:scale-[0.98] transition-transform">
              <Plus className="w-4 h-4" />Salvar Lote no Estoque
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">Lotes Cadastrados</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="Buscar lote..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)} className="bg-transparent border-none outline-none text-xs w-32 placeholder:text-slate-400" />
                </div>
                <div className="flex gap-1">
                  {(['all', 'ok', 'expiring', 'expired', 'empty'] as const).map((s) => {
                    const labels: Record<string, string> = { all: 'Todos', ok: 'Ok', expiring: 'Vence', expired: 'Vencido', empty: 'Esgotado' };
                    const colors: Record<string, string> = { all: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', ok: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', expiring: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', expired: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400', empty: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' };
                    return (
                      <button key={s} onClick={() => setBatchStatusFilter(s)} className={'px-2 py-1 rounded text-[9px] font-semibold transition-all ' + (batchStatusFilter === s ? colors[s] : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200')}>
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{filteredBatches.length} de {batches.length} lotes exibidos</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[640px]">
                <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
                  <tr>
                    <th className="p-4">Lote</th>
                    <th className="p-4">Medicamento</th>
                    <th className="p-4">Quantidade</th>
                    <th className="p-4">Validade</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBatches.slice(0, 15).map((b, idx) => (
                    <tr key={b.id} className={(idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover cursor-pointer'} onClick={() => setSelectedBatch(b)}>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">{b.batchNumber}</td>
                      <td className="p-4">{b.medicine?.name} {b.medicine?.dosage}</td>
                      <td className="p-4 font-semibold">{b.currentQuantity}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(b.expirationDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4"><ExpiryBadge expirationDate={b.expirationDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Detail Dialog */}
      <Dialog open={Boolean(selectedBatch)} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                  <Boxes className="w-5 h-5" />
                </div>
                Detalhes do Lote
              </DialogTitle>
              {canWrite && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => selectedBatch && openEditDialog(selectedBatch)} className="rounded-xl gap-1.5 text-xs">
                  <Pencil className="w-3.5 h-3.5" />Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="rounded-xl gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30">
                  <Trash2 className="w-3.5 h-3.5" />Excluir
                </Button>
              </div>
              )}
            </div>
            <DialogDescription>Informações completas e histórico de movimentações</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número do Lote</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 font-mono">{selectedBatch.batchNumber}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicamento</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    {selectedBatch.medicine?.name} {selectedBatch.medicine?.dosage}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade Atual</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">{selectedBatch.currentQuantity} un.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validade</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedBatch.expirationDate).toLocaleDateString('pt-BR')}</span>
                    <ExpiryBadge expirationDate={selectedBatch.expirationDate} />
                  </div>
                </div>
              </div>

              {selectedBatch.receivedAt && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Recebimento</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{new Date(selectedBatch.receivedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              )}

              {/* History Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />Histórico ({batchHistory.length})
                </h4>
                {batchHistory.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-center">
                    <p className="text-sm text-slate-400">Nenhuma movimentação registrada para este lote.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {batchHistory.map((item, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ' + (item.type === 'disposal' ? 'bg-rose-500' : 'bg-emerald-500')}>
                            {item.type === 'disposal' ? 'D' : 'R'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.description}</p>
                            <p className="text-[10px] text-slate-400">{item.userName} • {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                        </div>
                        <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-md ' + (item.type === 'disposal' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20')}>
                          {item.type === 'disposal' ? 'Descarte' : 'Retirada'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Lote</DialogTitle>
            <DialogDescription>Atualize as informações do lote selecionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Número do Lote</Label>
              <Input value={editForm.batchNumber} onChange={(e) => setEditForm({ ...editForm, batchNumber: e.target.value })} placeholder="LOT-2026-08A" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Quantidade Atual</Label>
              <Input type="number" min={0} required value={editForm.currentQuantity || ''} onChange={(e) => setEditForm({ ...editForm, currentQuantity: Number(e.target.value) })} placeholder="0" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Data de Validade</Label>
              <Input type="date" required value={editForm.expirationDate} onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl" disabled={editLoading}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={editLoading}>
                {editLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {editLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Lote"
        description={`Tem certeza que deseja excluir o lote "${selectedBatch?.batchNumber}"? Esta ação não pode ser desfeita. Se o lote possuir retiradas ou descartes associados, a exclusão será bloqueada.`}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
