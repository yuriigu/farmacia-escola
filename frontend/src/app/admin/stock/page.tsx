'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Boxes, Plus, Search, Trash2, Edit, AlertTriangle,
  CheckCircle2, Clock, Calendar, Package, ArrowLeft, X, Filter
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useBatches,
  useMedicines,
  useCreateBatch,
  useDeleteBatch,
  useUpdateBatch
} from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const batchSchema = z.object({
  medicineId: z.number({ required_error: 'Selecione um medicamento' }).min(1, 'Selecione um medicamento'),
  batchNumber: z.string().min(2, 'Informe o número do lote'),
  currentQuantity: z.number({ required_error: 'Informe a quantidade' }).min(1, 'Quantidade mínima é 1'),
  expirationDate: z.string().min(1, 'Informe a data de validade'),
});

type BatchFormData = z.infer<typeof batchSchema>;

export default function AdminStockPage() {
  const user = useAuthStore((s) => s.user);
  const { data: batches = [], isLoading, isError, refetch } = useBatches();
  const { data: medicines = [] } = useMedicines();
  const createBatchMutation = useCreateBatch();
  const deleteBatchMutation = useDeleteBatch();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      medicineId: 0,
      batchNumber: '',
      currentQuantity: 100,
      expirationDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: BatchFormData) => {
    createBatchMutation.mutate(
      {
        medicineId: data.medicineId,
        batchNumber: data.batchNumber,
        currentQuantity: data.currentQuantity,
        expirationDate: data.expirationDate,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          reset();
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (batchToDelete) {
      deleteBatchMutation.mutate(batchToDelete, {
        onSuccess: () => setBatchToDelete(null),
      });
    }
  };

  // Filter batches
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const filteredBatches = batches.filter((batch) => {
    const medName = batch.medicine?.name || '';
    const matchesSearch =
      medName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const expTime = new Date(batch.expirationDate).getTime();
    const isExpired = expTime < now;
    const isExpiring = !isExpired && expTime - now <= thirtyDaysMs;
    const isOk = !isExpired && !isExpiring;

    if (statusFilter === 'EXPIRED') return matchesSearch && isExpired;
    if (statusFilter === 'EXPIRING') return matchesSearch && isExpiring;
    if (statusFilter === 'OK') return matchesSearch && isOk;

    return matchesSearch;
  });

  return (
    <AppShell activeModuleId={'estoque'} pageTitle="Gerenciamento de Lotes e Estoque">
      <div className="space-y-6 max-w-7xl mx-auto page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-2">
              <Boxes className="w-3.5 h-3.5" />
              Controle de Entrada e Validade
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Gestão de Lotes de Medicamentos</h1>
            <p className="text-slate-200 text-sm mt-1 max-w-xl">
              Cadastre novos lotes recebidos, acompanhe o vencimento de produtos e controle o saldo de cada medicamento.
            </p>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold shadow-md shadow-black/10 gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Lote
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por lote ou medicamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'Todos os Lotes' },
                { id: 'OK', label: 'Em Dia' },
                { id: 'EXPIRING', label: 'Vencendo em 30 dias' },
                { id: 'EXPIRED', label: 'Vencidos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batches Table / Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum lote encontrado</h3>
            <p className="text-sm text-slate-400">Cadastre um novo lote para alimentar o estoque da farmácia.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Medicamento</th>
                    <th className="py-3.5 px-4">Número do Lote</th>
                    <th className="py-3.5 px-4">Qtd. Atual</th>
                    <th className="py-3.5 px-4">Validade</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredBatches.map((b) => {
                    const expTime = new Date(b.expirationDate).getTime();
                    const isExpired = expTime < now;
                    const isExpiring = !isExpired && expTime - now <= thirtyDaysMs;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          {b.medicine?.name || `Medicamento #${b.medicineId}`}
                          {b.medicine?.dosage && (
                            <span className="text-xs text-slate-400 font-normal ml-1">({b.medicine.dosage})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-xs text-slate-600 dark:text-slate-300">
                          {b.batchNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {b.currentQuantity} un.
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {new Date(b.expirationDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4">
                          {isExpired ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-bold">
                              Vencido
                            </Badge>
                          ) : isExpiring ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-bold">
                              Vence em breve
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
                              Válido
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBatchToDelete(b.id)}
                            className="text-slate-400 hover:text-rose-600 rounded-lg p-1.5 h-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create Batch */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Boxes className="w-5 h-5 text-emerald-600" />
                Cadastrar Novo Lote
              </DialogTitle>
              <DialogDescription>
                Registre uma nova remessa de medicamento no estoque.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="medicineId" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Medicamento *
                </Label>
                <select
                  id="medicineId"
                  {...register('medicineId', { valueAsNumber: true })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={0}>Selecione um medicamento...</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.dosage ? `(${m.dosage})` : ''}
                    </option>
                  ))}
                </select>
                {errors.medicineId && (
                  <p className="text-xs text-rose-500 font-medium">{errors.medicineId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batchNumber" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Número / Código do Lote *
                </Label>
                <Input
                  id="batchNumber"
                  placeholder="Ex: LOT-2026-A"
                  {...register('batchNumber')}
                  className="rounded-xl h-11 font-mono uppercase"
                />
                {errors.batchNumber && (
                  <p className="text-xs text-rose-500 font-medium">{errors.batchNumber.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currentQuantity" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Qtd. Recebida *
                  </Label>
                  <Input
                    id="currentQuantity"
                    type="number"
                    min={1}
                    {...register('currentQuantity', { valueAsNumber: true })}
                    className="rounded-xl h-11"
                  />
                  {errors.currentQuantity && (
                    <p className="text-xs text-rose-500 font-medium">{errors.currentQuantity.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expirationDate" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Data de Validade *
                  </Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('expirationDate')}
                    className="rounded-xl h-11"
                  />
                  {errors.expirationDate && (
                    <p className="text-xs text-rose-500 font-medium">{errors.expirationDate.message}</p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {createBatchMutation.isPending ? 'Cadastrando...' : 'Cadastrar Lote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover este lote do estoque?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá o lote e descontará o saldo do medicamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
