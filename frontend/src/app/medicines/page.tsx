'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package, Search, Plus, Calendar, ArrowRight,
  Filter, CheckCircle2, AlertCircle, Sparkles, X, Info
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMedicines, useCreateMedicine } from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { MEDICINE_CATEGORIES, MEDICINE_CATEGORY_COLORS, MEDICINE_CATEGORY_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';

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
  const filteredMedicines = medicines.filter((med) => {
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

  return (
    <AppShell activeModuleId={'medicines' as any} pageTitle="Catálogo de Medicamentos">
      <div className="space-y-6 max-w-7xl mx-auto page-enter">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-xl shadow-emerald-900/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Disponibilidade em Tempo Real
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Catálogo de Medicamentos</h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Consulte medicamentos disponíveis para retirada gratuita na Farmácia Escola Universitária.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCreate && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold shadow-md shadow-black/10 gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo Medicamento
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por nome, princípio ativo ou dosagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20"
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

            {/* Availability Filter */}
            <div className="md:col-span-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todas as disponibilidades</option>
                <option value="available">Apenas em estoque</option>
                <option value="out_of_stock">Apenas em falta</option>
              </select>
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

        {/* Medicines Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="h-4 w-48 bg-slate-100 dark:bg-slate-700/60 rounded" />
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/60 rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="font-semibold text-slate-800 dark:text-slate-200">Não foi possível carregar os medicamentos.</p>
            <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
              Tentar Novamente
            </Button>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum medicamento encontrado</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Tente ajustar os termos de busca ou filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMedicines.map((med) => {
              const isAvailable = (med.totalQuantity ?? 0) > 0;
              const catKey = (med.category || 'outro').toLowerCase();
              const categoryLabel = MEDICINE_CATEGORY_LABELS[catKey] || med.category || 'Geral';
              const categoryColor = MEDICINE_CATEGORY_COLORS[catKey] || 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={med.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold mb-1.5 ${categoryColor}`}>
                          {categoryLabel}
                        </span>
                        <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {med.name}
                        </h3>
                        {med.dosage && (
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {med.dosage}
                          </p>
                        )}
                      </div>

                      {/* Stock Badge */}
                      <Badge
                        variant="outline"
                        className={
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-semibold'
                        }
                      >
                        {isAvailable ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {med.totalQuantity} un.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Em falta
                          </span>
                        )}
                      </Badge>
                    </div>

                    {med.activeIngredient && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Princípio ativo:</span> {med.activeIngredient}
                      </p>
                    )}

                    {med.accessibleDesc && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl line-clamp-2 border border-slate-100 dark:border-slate-800">
                        {med.accessibleDesc}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/medicines/${med.id}`}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Detalhes
                    </Link>

                    <Button
                      asChild
                      size="sm"
                      disabled={!isAvailable}
                      className={`rounded-xl text-xs font-bold gap-1.5 ${
                        isAvailable
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 pointer-events-none'
                      }`}
                    >
                      <Link href={`/appointments/new?medicineId=${med.id}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        Agendar
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: New Medicine */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Package className="w-5 h-5 text-emerald-600" />
                Cadastrar Novo Medicamento
              </DialogTitle>
              <DialogDescription>
                Adicione as informações do medicamento ao catálogo da Farmácia Escola.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Nome do Medicamento *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Paracetamol"
                  {...register('name')}
                  className="rounded-xl h-11"
                />
                {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dosage" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Dosagem
                  </Label>
                  <Input
                    id="dosage"
                    placeholder="Ex: 500mg"
                    {...register('dosage')}
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Categoria
                  </Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {MEDICINE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="activeIngredient" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Princípio Ativo
                </Label>
                <Input
                  id="activeIngredient"
                  placeholder="Ex: Paracetamol / Acetaminofeno"
                  {...register('activeIngredient')}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accessibleDesc" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Descrição Acessível (Para o Paciente)
                </Label>
                <textarea
                  id="accessibleDesc"
                  rows={3}
                  placeholder="Ex: Indicado para alívio de dores leves a moderadas e febre."
                  {...register('accessibleDesc')}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
