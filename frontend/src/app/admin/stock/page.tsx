'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Boxes, Plus, Search, Trash2, AlertTriangle,
  CheckCircle2, Clock, Calendar, Package, X
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useBatches,
  useMedicines,
  useCreateBatch,
  useDeleteBatch,
} from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
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
import type { Batch } from '@/lib/types';

const batchSchema = z.object({
  medicineId: z.number({ message: 'Selecione um medicamento' }).min(1, 'Selecione um medicamento'),
  batchNumber: z.string().min(2, 'Informe o número do lote'),
  currentQuantity: z.number({ message: 'Informe a quantidade' }).min(1, 'Quantidade mínima é 1'),
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

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
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
  }, [batches, searchTerm, statusFilter, now]);

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
      header: 'Medicamento Associado',
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
      header: 'Quantidade em Estoque',
      width: '180px',
      cell: (batch) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {batch.currentQuantity} unidades
        </span>
      ),
    },
    {
      header: 'Data de Validade',
      width: '160px',
      cell: (batch) => {
        const expDate = new Date(batch.expirationDate);
        const expTime = expDate.getTime();
        const isExpired = expTime < now;
        const isExpiring = !isExpired && expTime - now <= thirtyDaysMs;

        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {expDate.toLocaleDateString('pt-BR')}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (batch) => {
        const expTime = new Date(batch.expirationDate).getTime();
        const isExpired = expTime < now;
        const isExpiring = !isExpired && expTime - now <= thirtyDaysMs;

        return (
          <Badge
            variant="outline"
            className={
              isExpired
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-[11px]'
                : isExpiring
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 font-semibold text-[11px]'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-[11px]'
            }
          >
            {isExpired ? 'Vencido' : isExpiring ? 'Vencendo em 30d' : 'Em Dia'}
          </Badge>
        );
      },
    },
    {
      header: 'Ações',
      width: '90px',
      align: 'right',
      cell: (batch) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBatchToDelete(batch.id)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Excluir lote"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell activeModuleId={'estoque'} pageTitle="Gerenciamento de Lotes e Estoque">
      <div className="space-y-5 max-w-7xl mx-auto page-enter">
        {/* Standard PageHeader */}
        <PageHeader
          title="Gestão de Lotes de Medicamentos"
          description="Cadastre novos lotes recebidos, acompanhe o vencimento de produtos e controle o saldo de cada medicamento."
          icon={Boxes}
          actions={
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Lote</span>
            </Button>
          }
        />

        {/* Compact Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por lote ou medicamento..."
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

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'Todos os Lotes' },
              { id: 'OK', label: 'Em Dia' },
              { id: 'EXPIRING', label: 'Vencendo em 30d' },
              { id: 'EXPIRED', label: 'Vencidos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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

        {/* Standard DataTable */}
        <DataTable
          columns={columns}
          data={filteredBatches}
          isLoading={isLoading}
          emptyIcon={Boxes}
          emptyTitle="Nenhum lote encontrado"
          emptyDescription="Tente ajustar os filtros ou cadastre um novo lote para começar."
          emptyAction={
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Novo Lote
            </Button>
          }
        />

        {/* Create Batch Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[480px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Boxes className="w-5 h-5 text-emerald-600" />
                Cadastrar Novo Lote
              </DialogTitle>
              <DialogDescription>
                Adicione uma nova remessa de medicamento ao estoque da farmácia.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="medicineId" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Medicamento *
                </Label>
                <select
                  id="medicineId"
                  {...register('medicineId', { valueAsNumber: true })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="batchNumber" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Número do Lote *
                  </Label>
                  <Input
                    id="batchNumber"
                    placeholder="Ex: LOT-2026-08A"
                    {...register('batchNumber')}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  {errors.batchNumber && (
                    <p className="text-xs text-rose-500 font-medium">{errors.batchNumber.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currentQuantity" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Quantidade *
                  </Label>
                  <Input
                    id="currentQuantity"
                    type="number"
                    min={1}
                    {...register('currentQuantity', { valueAsNumber: true })}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  {errors.currentQuantity && (
                    <p className="text-xs text-rose-500 font-medium">{errors.currentQuantity.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expirationDate" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Data de Validade *
                </Label>
                <Input
                  id="expirationDate"
                  type="date"
                  {...register('expirationDate')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {errors.expirationDate && (
                  <p className="text-xs text-rose-500 font-medium">{errors.expirationDate.message}</p>
                )}
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {createBatchMutation.isPending ? 'Salvando...' : 'Salvar Lote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={batchToDelete !== null} onOpenChange={() => setBatchToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                Excluir Lote
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja excluir este lote? Caso haja dispensas ou retiradas associadas, a exclusão poderá falhar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}