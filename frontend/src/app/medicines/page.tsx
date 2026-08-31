'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package, Search, Plus, Calendar, ArrowRight,
  Pill, CheckCircle2, AlertCircle, X, Eye
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMedicines, useCreateMedicine } from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { MEDICINE_CATEGORIES, MEDICINE_CATEGORY_COLORS, MEDICINE_CATEGORY_LABELS } from '@/lib/constants';
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
import type { Medicine } from '@/lib/types';

const newMedicineSchema = z.object({
  name: z.string().min(2, 'Nome do medicamento é obrigatório'),
  activeIngredient: z.string().optional(),
  dosage: z.string().optional(),
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
});

type NewMedicineFormData = z.infer<typeof newMedicineSchema>;

export default function MedicinesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: medicines = [], isLoading, isError, refetch } = useMedicines();
  const createMedicineMutation = useCreateMedicine();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'out_of_stock'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewMedicineFormData>({
    resolver: zodResolver(newMedicineSchema),
    defaultValues: {
      name: '',
      activeIngredient: '',
      dosage: '',
      accessibleDesc: '',
      category: 'analgesico',
    },
  });

  const onSubmit = (data: NewMedicineFormData) => {
    createMedicineMutation.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      },
    });
  };

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const matchesSearch =
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (med.activeIngredient && med.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (med.dosage && med.dosage.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || med.category?.toLowerCase() === selectedCategory.toLowerCase();

      const isAvailable = (med.totalQuantity ?? 0) > 0;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'available' && isAvailable) ||
        (stockFilter === 'out_of_stock' && !isAvailable);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medicines, searchTerm, selectedCategory, stockFilter]);

  const columns: Column<Medicine>[] = [
    {
      header: 'Medicamento',
      width: '260px',
      cell: (med) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
              {med.name}
            </p>
            {med.dosage && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                {med.dosage}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Categoria',
      width: '140px',
      cell: (med) => {
        const catKey = (med.category || 'outro').toLowerCase();
        const categoryLabel = MEDICINE_CATEGORY_LABELS[catKey] || med.category || 'Geral';
        const categoryColor = MEDICINE_CATEGORY_COLORS[catKey] || 'bg-slate-100 text-slate-600';
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${categoryColor}`}>
            {categoryLabel}
          </span>
        );
      },
    },
    {
      header: 'Princípio Ativo',
      cell: (med) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {med.activeIngredient || '—'}
        </span>
      ),
    },
    {
      header: 'Estoque Total',
      width: '140px',
      cell: (med) => {
        const isAvailable = (med.totalQuantity ?? 0) > 0;
        return (
          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {med.totalQuantity ?? 0} un.
          </span>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (med) => {
        const isAvailable = (med.totalQuantity ?? 0) > 0;
        return (
          <Badge
            variant="outline"
            className={
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-[11px]'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-[11px]'
            }
          >
            {isAvailable ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Disponível
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Em falta
              </span>
            )}
          </Badge>
        );
      },
    },
    {
      header: 'Ações',
      width: '140px',
      align: 'right',
      cell: (med) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-8 px-2.5 rounded-lg text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <Link href={`/medicines/${med.id}`}>
              <Eye className="w-3.5 h-3.5" />
              <span>Ver</span>
            </Link>
          </Button>
          {(med.totalQuantity ?? 0) > 0 && (
            <Button
              size="sm"
              asChild
              className="h-8 px-2.5 rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Link href={`/appointments/new?medicineId=${med.id}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar</span>
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell activeModuleId={'medicines' as any} pageTitle="Catálogo de Medicamentos">
      <div className="space-y-5 max-w-7xl mx-auto page-enter">
        {/* Standard PageHeader */}
        <PageHeader
          title="Catálogo de Medicamentos"
          description="Consulte medicamentos disponíveis para retirada gratuita na Farmácia Escola Universitária."
          icon={Package}
          actions={
            canCreate ? (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Medicamento</span>
              </Button>
            ) : undefined
          }
        />

        {/* Compact Filters */}
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por nome, princípio ativo ou dosagem..."
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

            {/* Availability Filter */}
            <div className="sm:col-span-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todas as disponibilidades</option>
                <option value="available">Apenas em estoque</option>
                <option value="out_of_stock">Apenas em falta</option>
              </select>
            </div>

            {/* Category Select */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Standard DataTable */}
        <DataTable
          columns={columns}
          data={filteredMedicines}
          isLoading={isLoading}
          emptyIcon={Package}
          emptyTitle="Nenhum medicamento encontrado"
          emptyDescription="Tente ajustar os termos de busca ou os filtros selecionados."
          emptyAction={
            canCreate ? (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Medicamento
              </Button>
            ) : undefined
          }
          onRowClick={(med) => router.push(`/medicines/${med.id}`)}
        />

        {/* Create Medicine Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Package className="w-5 h-5 text-emerald-600" />
                Novo Medicamento
              </DialogTitle>
              <DialogDescription>
                Cadastre um novo item no catálogo da Farmácia Escola.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Nome do Medicamento *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Paracetamol, Amoxicilina..."
                  {...register('name')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dosage" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Dosagem
                  </Label>
                  <Input
                    id="dosage"
                    placeholder="Ex: 500mg, 50mg/ml"
                    {...register('dosage')}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Categoria
                  </Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {MEDICINE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="activeIngredient" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Princípio Ativo
                </Label>
                <Input
                  id="activeIngredient"
                  placeholder="Ex: Paracetamol monoidratado"
                  {...register('activeIngredient')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accessibleDesc" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Descrição Acessível / Instruções
                </Label>
                <Input
                  id="accessibleDesc"
                  placeholder="Instruções para o paciente em linguagem simples..."
                  {...register('accessibleDesc')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
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
                  disabled={createMedicineMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {createMedicineMutation.isPending ? 'Salvando...' : 'Salvar Medicamento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}