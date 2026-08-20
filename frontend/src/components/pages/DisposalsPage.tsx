'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Undo2, Download } from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import type { DisposalDraft } from '@/lib/types';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DisposalsPage() {
  const { disposals, batches } = usePharmacyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [reverting, setReverting] = useState<number | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [form, setForm] = useState<DisposalDraft>({ batchId: 0, quantity: 0, reason: 'Medicamento Vencido' });

  const REASONS = ['Medicamento Vencido', 'Embalagem Danificada', 'Recolhimento ANVISA', 'Contaminação', 'Outro'];

  useEffect(() => {
    fetchBatchesData().finally(() => setLoadingBatches(false));
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const overBalance = Boolean(selectedBatch) && form.quantity > (selectedBatch?.currentQuantity ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || overBalance || form.quantity <= 0) return;
    try {
      await api.createDisposal(form);
      toast.success('Descarte registrado com sucesso.');
      setForm({ batchId: 0, quantity: 0, reason: REASONS[0] });
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao registrar descarte.');
    }
  };

  const handleRevert = async (id: number) => {
    try {
      await api.revertDisposal(id);
      toast.success('Descarte revertido com sucesso.');
      setReverting(null);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao reverter descarte.');
    }
  };

  const revertingDisposal = disposals.find((d) => d.id === reverting);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-600" />Registro de Descartes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Histórico de descarte seguro de insumos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            const header = ['Medicamento', 'Lote', 'Quantidade', 'Motivo', 'Registrado por', 'Data', 'Revertido'];
            const rows = disposals.map((d) => [d.batch.medicine.name, d.batch.code, String(d.quantity), d.reason, d.user.name, d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : '-', d.reverted ? 'Sim' : 'Não']);
            downloadCSV('descartes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
            toast.success('Relatório exportado com sucesso!');
          }} disabled={disposals.length === 0} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4" />Exportar CSV
          </Button>
          <Button onClick={() => { setForm({ batchId: 0, quantity: 0, reason: REASONS[0] }); setModalOpen(true); }} className="rounded-xl gap-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Novo Descarte
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[640px]">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
                <tr>
                  <th className="p-4">Medicamento / Lote</th>
                  <th className="p-4">Quantidade</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Registrado por</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {disposals.length === 0 ? (
                  <tr><td colSpan={6} className="p-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-900/10 flex items-center justify-center mb-4">
                        <Trash2 className="w-10 h-10 text-rose-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhum descarte registrado</p>
                      <p className="text-xs text-slate-400 mt-1">O histórico de descartes aparecerá aqui automaticamente.</p>
                    </div>
                  </td></tr>
                ) : (
                  disposals.map((d, idx) => (
                    <tr key={d.id} className={(d.reverted ? 'bg-slate-50/60 dark:bg-slate-800/30 text-slate-400 table-row-hover' : (idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover')}>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {d.batch.medicine.name}
                        <span className="block text-xs font-normal text-slate-400">Lote: {d.batch.code}</span>
                      </td>
                      <td className="p-4 font-medium">{d.quantity} un.</td>
                      <td className="p-4 font-medium text-rose-700 dark:text-rose-400">
                        {d.reason || 'Não especificado'}
                        {d.reverted && <span className="block text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-0.5">Descarte revertido</span>}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{d.user.name}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => setReverting(d.id)} disabled={d.reverted}
                          className="rounded-xl gap-1 text-xs disabled:opacity-40"
                        >
                          <Undo2 className="w-3.5 h-3.5" />Reverter
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

      {/* New Disposal Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Descarte</DialogTitle>
            <DialogDescription>A quantidade informada será retirada do estoque.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Lote</Label>
              <Select value={form.batchId ? String(form.batchId) : ''} onValueChange={(v) => setForm({ ...form, batchId: Number(v) })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" disabled={loadingBatches}>
                  <SelectValue placeholder={loadingBatches ? 'Carregando lotes...' : 'Selecione um lote...'} />
                </SelectTrigger>
                <SelectContent>
                  {batches.filter((b) => b.currentQuantity > 0).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.medicine?.name} {b.medicine?.dosage} — Lote {b.batchNumber} — saldo: {b.currentQuantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Motivo</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Quantidade descartada</Label>
              <Input type="number" min={1} max={selectedBatch?.currentQuantity} required value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              {overBalance && <p className="text-xs text-rose-600 mt-1">Quantidade excede o saldo disponível.</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={overBalance || !selectedBatch} className="rounded-xl bg-rose-600 hover:bg-rose-700">Confirmar Descarte</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Modal */}
      <Dialog open={Boolean(reverting)} onOpenChange={() => setReverting(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Reverter Descarte</DialogTitle>
            <DialogDescription>Restaura a quantidade ao estoque.</DialogDescription>
          </DialogHeader>
          {revertingDisposal && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                <p className="font-medium text-slate-900 dark:text-white text-sm">{revertingDisposal.batch.medicine.name} {revertingDisposal.batch.medicine.dosage}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Serão restauradas <span className="font-medium">{revertingDisposal.quantity} un.</span> ao estoque.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Motivo original: {revertingDisposal.reason}</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setReverting(null)} className="rounded-xl">Cancelar</Button>
                <Button onClick={() => handleRevert(revertingDisposal.id)} className="rounded-xl bg-teal-600 hover:bg-teal-700">Confirmar Reversão</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
