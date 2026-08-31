'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Undo2, Download, Package, Calendar, User, Search, X } from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import type { DisposalDraft, Disposal } from '@/lib/types';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DisposalsPage() {
  const { disposals, batches, loading } = usePharmacyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [reverting, setReverting] = useState<number | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<DisposalDraft>({ batchId: 0, quantity: 0, reason: 'Medicamento Vencido' });

  const REASONS = ['Medicamento Vencido', 'Embalagem Danificada', 'Recolhimento ANVISA', 'Contaminação', 'Outro'];

  useEffect(() => {
    fetchBatchesData().finally(() => setLoadingBatches(false));
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const overBalance = Boolean(selectedBatch) && form.quantity > (selectedBatch?.currentQuantity ?? 0);

  const filteredDisposals = useMemo(() => {
    return disposals.filter((d) => {
      const medName = d.batch.medicine?.name || '';
      const batchCode = d.batch.code || '';
      const reason = d.reason || '';
      const user = d.user?.name || '';

      return (
        !searchTerm ||
        medName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [disposals, searchTerm]);

  const handleExportCSV = () => {
    const header = ['Medicamento', 'Lote', 'Quantidade', 'Motivo', 'Registrado por', 'Data', 'Revertido'];
    const rows = filteredDisposals.map((d) => [
      d.batch.medicine.name,
      d.batch.code,
      String(d.quantity),
      d.reason,
      d.user.name,
      d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : '-',
      d.reverted ? 'Sim' : 'Não',
    ]);
    downloadCSV('descartes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

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

  const columns: Column<Disposal>[] = [
    {
      header: 'Medicamento / Lote',
      width: '260px',
      cell: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
              {d.batch.medicine.name}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Lote: {d.batch.code}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Quantidade',
      width: '130px',
      cell: (d) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {d.quantity} un.
        </span>
      ),
    },
    {
      header: 'Motivo',
      cell: (d) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {d.reason}
        </span>
      ),
    },
    {
      header: 'Registrado por',
      width: '160px',
      cell: (d) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{d.user.name}</span>
        </div>
      ),
    },
    {
      header: 'Data',
      width: '140px',
      cell: (d) => {
        const date = d.createdAt ? new Date(d.createdAt) : null;
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{date ? date.toLocaleDateString('pt-BR') : '—'}</span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '120px',
      cell: (d) => (
        <Badge
          variant="outline"
          className={
            d.reverted
              ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 text-[10px]'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px]'
          }
        >
          {d.reverted ? 'Revertido' : 'Descartado'}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      width: '100px',
      align: 'right',
      cell: (d) =>
        !d.reverted ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReverting(d.id)}
            className="h-8 px-2 rounded-lg text-xs gap-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            title="Reverter descarte"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Reverter</span>
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Registro de Descartes"
        description="Histórico e rastreabilidade do descarte seguro de insumos e medicamentos vencidos ou avariados."
        icon={Trash2}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredDisposals.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              onClick={() => {
                setForm({ batchId: 0, quantity: 0, reason: REASONS[0] });
                setModalOpen(true);
              }}
              className="h-10 rounded-xl gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Descarte</span>
            </Button>
          </>
        }
      />

      {/* Compact Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por medicamento, lote ou motivo..."
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
        data={filteredDisposals}
        isLoading={loading}
        emptyIcon={Trash2}
        emptyTitle="Nenhum descarte registrado"
        emptyDescription="Não há registros de descarte correspondentes aos filtros aplicados."
        emptyAction={
          <Button
            onClick={() => {
              setForm({ batchId: 0, quantity: 0, reason: REASONS[0] });
              setModalOpen(true);
            }}
            className="h-9 rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Descarte
          </Button>
        }
      />

      {/* Create Disposal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Novo Registro de Descarte
            </DialogTitle>
            <DialogDescription>
              Selecione o lote e a quantidade de unidades para inutilização e baixa de estoque.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Lote de Origem *
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
                        {b.medicine?.name} • Lote {b.batchNumber} ({b.currentQuantity} un.)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade a Descartar *
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
                  Quantidade maior que o saldo disponível ({selectedBatch?.currentQuantity} un.).
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Motivo do Descarte *
              </Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!selectedBatch || overBalance || form.quantity <= 0}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Confirmar Descarte
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revert Dialog */}
      <Dialog open={reverting !== null} onOpenChange={() => setReverting(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <Undo2 className="w-5 h-5" />
              Reverter Descarte
            </DialogTitle>
            <DialogDescription>
              Deseja reverter este descarte? A quantidade de unidades retornará automaticamente ao saldo do lote de origem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setReverting(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => reverting && handleRevert(reverting)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Sim, Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}