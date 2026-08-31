'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Package, Pill, Boxes, Plus, Search, Download, Pencil, Trash2, Eye, X } from 'lucide-react';
import { usePharmacyStore, fetchAllData } from '@/lib/pharmacy-store';
import { computeStockStatus } from '@/lib/types';
import type { Medicine } from '@/lib/types';
import { downloadCSV, MEDICINE_CATEGORIES, MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS, canWriteClient } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function InventoryPage() {
  const { medicines, batches, withdrawals, loading } = usePharmacyStore();
  const { user } = useAuthStore();
  const isPatient = user?.role === 'PACIENTE';
  const canWrite = canWriteClient(user?.role, user?.permissions, 'medicines');
  const canExport = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';
  const [myMedsOnly, setMyMedsOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', activeIngredient: '', dosage: '', accessibleDesc: '', category: '' });
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', activeIngredient: '', dosage: '', accessibleDesc: '', category: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const patientWithdrawalMedicineIds = useMemo(() => {
    if (!isPatient || !myMedsOnly) return null;
    const ids = new Set<number>();
    withdrawals.forEach((w) => ids.add(w.batch.medicineId));
    return ids;
  }, [isPatient, myMedsOnly, withdrawals]);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.activeIngredient && m.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.dosage && m.dosage.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || computeStockStatus(m) === statusFilter;
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchesMyMeds = !patientWithdrawalMedicineIds || patientWithdrawalMedicineIds.has(m.id);
      return matchesSearch && matchesStatus && matchesCategory && matchesMyMeds;
    });
  }, [medicines, searchTerm, statusFilter, categoryFilter, patientWithdrawalMedicineIds]);

  const medicineBatches = useMemo(() => {
    if (!selectedMedicine) return [];
    return batches.filter((b) => b.medicineId === selectedMedicine.id).sort((a, b) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime());
  }, [selectedMedicine, batches]);

  const handleExportCSV = () => {
    const header = ['Medicamento', 'Categoria', 'Principio Ativo', 'Dosagem', 'Estoque Total', 'Lotes', 'Status'];
    const rows = filtered.map((m) => [
      m.name,
      m.category ? MEDICINE_CATEGORY_LABELS[m.category] || m.category : '',
      m.activeIngredient || '',
      m.dosage || '',
      String(m.totalQuantity),
      String(m.batchesCount),
      computeStockStatus(m),
    ]);
    downloadCSV('medicamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMedicine(draft);
      toast.success('Medicamento cadastrado com sucesso.');
      setModalOpen(false);
      setDraft({ name: '', activeIngredient: '', dosage: '', accessibleDesc: '', category: '' });
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao cadastrar medicamento.');
    }
  };

  const openEditDialog = (med: Medicine) => {
    setSelectedMedicine(med);
    setEditDraft({
      name: med.name,
      activeIngredient: med.activeIngredient || '',
      dosage: med.dosage || '',
      accessibleDesc: med.accessibleDesc || '',
      category: med.category || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    setEditLoading(true);
    try {
      await api.updateMedicine(selectedMedicine.id, editDraft);
      toast.success('Medicamento atualizado com sucesso.');
      setEditOpen(false);
      setSelectedMedicine(null);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao atualizar medicamento.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedicine) return;
    setDeleteLoading(true);
    try {
      await api.deleteMedicine(selectedMedicine.id);
      toast.success('Medicamento excluído com sucesso.');
      setDeleteOpen(false);
      setSelectedMedicine(null);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Não é possível excluir: o medicamento possui lotes ativos.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalFilteredItems = filtered.reduce((s, m) => s + (m.totalQuantity ?? 0), 0);

  const columns: Column<Medicine>[] = [
    {
      header: 'Medicamento',
      width: '260px',
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
              {m.name}
            </p>
            {m.dosage && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                {m.dosage}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Categoria',
      width: '140px',
      cell: (m) =>
        m.category ? (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              MEDICINE_CATEGORY_COLORS[m.category] || 'bg-slate-100 text-slate-600'
            }`}
          >
            {MEDICINE_CATEGORY_LABELS[m.category] || m.category}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      header: 'Princípio Ativo',
      cell: (m) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {m.activeIngredient || '—'}
        </span>
      ),
    },
    {
      header: 'Estoque Total',
      width: '130px',
      cell: (m) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {m.totalQuantity} un.
        </span>
      ),
    },
    {
      header: 'Lotes',
      width: '80px',
      align: 'center',
      cell: (m) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {m.batchesCount}
        </span>
      ),
    },
    {
      header: 'Status',
      width: '120px',
      cell: (m) => <StockStatusBadge status={computeStockStatus(m)} />,
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedMedicine(m)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Visualizar detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {!isPatient && canWrite && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEditDialog(m)}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                title="Editar medicamento"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedMedicine(m);
                  setDeleteOpen(true);
                }}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Excluir medicamento"
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
        title="Catálogo de Medicamentos"
        description="Consulte a disponibilidade em tempo real, saldo em estoque e validades de insumos."
        icon={Package}
        actions={
          <>
            {canExport && (
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filtered.length === 0}
                className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={() => setModalOpen(true)}
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Medicamento</span>
              </Button>
            )}
          </>
        }
      />

      {/* Compact Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
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

          {!isPatient && (
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
              {(['all', 'ok', 'low', 'critical', 'expired'] as const).map((s) => {
                const labels: Record<string, string> = { all: 'Todos', ok: 'Em Dia', low: 'Baixo', critical: 'Crítico', expired: 'Vencido' };
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === s
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Chips Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          {MEDICINE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                categoryFilter === cat.id
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {isPatient && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                id="my-meds"
                checked={myMedsOnly}
                onChange={(e) => setMyMedsOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-600"
              />
              <label htmlFor="my-meds" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                Meus Medicamentos
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyIcon={Package}
        emptyTitle="Nenhum medicamento encontrado"
        emptyDescription="Tente ajustar os termos de busca ou os filtros aplicados."
        emptyAction={
          canWrite ? (
            <Button
              onClick={() => setModalOpen(true)}
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Medicamento
            </Button>
          ) : undefined
        }
        onRowClick={(m) => setSelectedMedicine(m)}
        footer={
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
            <span>
              Total: <strong className="text-slate-700 dark:text-slate-300">{filtered.length}</strong> medicamentos ({totalFilteredItems.toLocaleString('pt-BR')} unidades em estoque)
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Em Dia ({medicines.filter((m) => computeStockStatus(m) === 'ok').length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Baixo ({medicines.filter((m) => computeStockStatus(m) === 'low').length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Crítico ({medicines.filter((m) => computeStockStatus(m) === 'critical').length})
              </span>
            </div>
          </div>
        }
      />

      {/* Create Medicine Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Novo Medicamento</DialogTitle>
            <DialogDescription>Cadastre um novo medicamento no catálogo do sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Nome do medicamento</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Dipirona Sódica" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Categoria</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICINE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Princípio Ativo</Label>
              <Input value={draft.activeIngredient} onChange={(e) => setDraft({ ...draft, activeIngredient: e.target.value })} placeholder="Ex: Dipirona monoidratada" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Dosagem</Label>
              <Input value={draft.dosage} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} placeholder="Ex: 500mg ou 50mg/mL" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Descrição Acessível</Label>
              <Textarea value={draft.accessibleDesc} onChange={(e) => setDraft({ ...draft, accessibleDesc: e.target.value })} placeholder="Orientações e indicações de uso..." rows={3} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Medicine Detail Dialog */}
      <Dialog open={Boolean(selectedMedicine && !editOpen && !deleteOpen)} onOpenChange={() => setSelectedMedicine(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                  <Pill className="w-5 h-5" />
                </div>
                {selectedMedicine?.name}
              </DialogTitle>
              {!isPatient && canWrite && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectedMedicine && openEditDialog(selectedMedicine)} className="rounded-xl gap-1.5 text-xs">
                    <Pencil className="w-3.5 h-3.5" />Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="rounded-xl gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30">
                    <Trash2 className="w-3.5 h-3.5" />Excluir
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>Detalhes completos do medicamento e lotes associados</DialogDescription>
          </DialogHeader>
          {selectedMedicine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</p>
                  <div className="mt-1">
                    {selectedMedicine.category ? (
                      <span className={'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ' + (MEDICINE_CATEGORY_COLORS[selectedMedicine.category] || 'bg-slate-50 text-slate-500')}>
                        {MEDICINE_CATEGORY_LABELS[selectedMedicine.category] || selectedMedicine.category}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Princípio Ativo</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedMedicine.activeIngredient || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosagem</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedMedicine.dosage || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Total</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">{selectedMedicine.totalQuantity} un.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <div className="mt-1"><StockStatusBadge status={computeStockStatus(selectedMedicine)} /></div>
                </div>
              </div>
              {selectedMedicine.accessibleDesc && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Descrição Acessível</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">{selectedMedicine.accessibleDesc}</p>
                </div>
              )}
              {!isPatient && medicineBatches.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Lotes ({medicineBatches.length})</h4>
                  <div className="space-y-2">
                    {medicineBatches.map((b) => (
                      <div key={b.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                            <Boxes className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{b.batchNumber}</p>
                            <p className="text-[10px] text-slate-400">Validade: {new Date(b.expirationDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{b.currentQuantity} un.</span>
                          <ExpiryBadge expirationDate={b.expirationDate} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Medicine Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Medicamento</DialogTitle>
            <DialogDescription>Atualize as informações do medicamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Nome do medicamento</Label>
              <Input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Dipirona Sódica" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Categoria</Label>
              <Select value={editDraft.category} onValueChange={(v) => setEditDraft({ ...editDraft, category: v })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICINE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Princípio Ativo</Label>
              <Input value={editDraft.activeIngredient} onChange={(e) => setEditDraft({ ...editDraft, activeIngredient: e.target.value })} placeholder="Dipirona sódica" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Dosagem</Label>
              <Input value={editDraft.dosage} onChange={(e) => setEditDraft({ ...editDraft, dosage: e.target.value })} placeholder="500mg" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Descrição Acessível</Label>
              <Textarea value={editDraft.accessibleDesc} onChange={(e) => setEditDraft({ ...editDraft, accessibleDesc: e.target.value })} placeholder="Descrição simples do medicamento..." rows={3} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl" disabled={editLoading}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={editLoading}>{editLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Medicamento"
        description={`Tem certeza que deseja excluir "${selectedMedicine?.name}"? Esta ação não pode ser desfeita. Se o medicamento possuir lotes ativos, o descarte será bloqueado.`}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}