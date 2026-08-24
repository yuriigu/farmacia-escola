'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Package, Pill, Boxes, Plus, Search, Download, Pencil, Trash2 } from 'lucide-react';
import { usePharmacyStore, fetchAllData } from '@/lib/pharmacy-store';
import { computeStockStatus } from '@/lib/types';
import type { Medicine } from '@/lib/types';
import { downloadCSV, MEDICINE_CATEGORIES, MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS, canWriteClient } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

  const filtered = medicines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.activeIngredient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dosage?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || computeStockStatus(m) === statusFilter;
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesMyMeds = !patientWithdrawalMedicineIds || patientWithdrawalMedicineIds.has(m.id);
    return matchesSearch && matchesStatus && matchesCategory && matchesMyMeds;
  });

  const medicineBatches = useMemo(() => {
    if (!selectedMedicine) return [];
    return batches.filter((b) => b.medicineId === selectedMedicine.id).sort((a, b) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime());
  }, [selectedMedicine, batches]);

  const expiringBatchMap = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const map: Record<number, boolean> = {};
    batches.forEach((b) => {
      const exp = new Date(b.expirationDate);
      if (exp <= threshold && exp >= now && b.currentQuantity > 0) {
        map[b.medicineId] = true;
      }
    });
    return map;
  }, [batches]);

  const handleExportCSV = () => {
    const header = ['Medicamento', 'Categoria', 'Principio Ativo', 'Dosagem', 'Estoque Total', 'Lotes', 'Status'];
    const rows = filtered.map((m) => [m.name, m.category ? MEDICINE_CATEGORY_LABELS[m.category] || m.category : '', m.activeIngredient || '', m.dosage || '', String(m.totalQuantity), String(m.batchesCount), computeStockStatus(m)]);
    downloadCSV('medicamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
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
    setEditDraft({ name: med.name, activeIngredient: med.activeIngredient || '', dosage: med.dosage || '', accessibleDesc: med.accessibleDesc || '', category: med.category || '' });
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
      toast.success('Medicamento descartado com sucesso.');
      setDeleteOpen(false);
      setSelectedMedicine(null);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Não é possível descartar: o medicamento possui lotes ativos.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalFilteredItems = filtered.reduce((s, m) => s + (m.totalQuantity ?? 0), 0);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />Catálogo de Medicamentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Consulte o saldo disponível e validades</p>
        </div>
        {canWrite && (
        <div className="flex items-center gap-2">
          {canExport && (
          <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4" />Exportar CSV
          </Button>
          )}
          <Button onClick={() => setModalOpen(true)} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Novo Medicamento
          </Button>
        </div>
        )}
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <Input
          type="text" placeholder="Buscar por nome, principio ativo ou dosagem..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
        {!isPatient && (
        <div className="flex gap-1 ml-auto mr-1">
          {(['all', 'ok', 'low', 'critical', 'expired'] as const).map((s) => {
            const labels: Record<string, string> = { all: 'Todos', ok: 'Em Dia', low: 'Baixo', critical: 'Crítico', expired: 'Vencido' };
            const colors: Record<string, string> = { all: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', ok: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', low: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', critical: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', expired: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={'px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ' + (statusFilter === s ? colors[s] + ' ring-1 ring-offset-1' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500')}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-1">
        {MEDICINE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={'px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ' + (categoryFilter === cat.id ? cat.color + ' ring-1 ring-offset-1' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500')}
          >
            {cat.label}
          </button>
        ))}
        {isPatient && (
          <div className="flex items-center gap-2 ml-2">
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

      {/* Status summary bar */}
      {!isPatient && (
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>{filtered.length} de {medicines.length} medicamentos</span>
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <span>{filtered.reduce((s, m) => s + (m.totalQuantity ?? 0), 0).toLocaleString('pt-BR')} un. em estoque</span>
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{medicines.filter((m) => computeStockStatus(m) === 'ok').length} em dia</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{medicines.filter((m) => computeStockStatus(m) === 'low').length} baixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />{medicines.filter((m) => computeStockStatus(m) === 'critical').length} crítico</span>
      </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[800px]">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
                <tr>
                  <th className="p-4">Medicamento</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Principio Ativo</th>
                  <th className="p-4">Estoque Total</th>
                  <th className="p-4">Lotes</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center"><Skeleton className="h-6 w-full max-w-sm mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 flex items-center justify-center mb-4">
                        <Package className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhum resultado</p>
                      <p className="text-xs text-slate-400 mt-1">Tente ajustar os termos da busca.</p>
                    </div>
                  </td></tr>
                ) : (
                  filtered.map((m, idx) => (
                    <tr key={m.id} className={(idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover cursor-pointer'} onClick={() => setSelectedMedicine(m)}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                            <p className="text-xs text-slate-400">{m.dosage}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {m.category ? (
                          <span className={'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ' + (MEDICINE_CATEGORY_COLORS[m.category] || 'bg-slate-50 text-slate-500')}>
                            {MEDICINE_CATEGORY_LABELS[m.category] || m.category}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{m.activeIngredient || '-'}</td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{m.totalQuantity} un.</td>
                      <td className="p-4">{m.batchesCount}</td>
                      <td className="p-4"><StockStatusBadge status={computeStockStatus(m)} /></td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <td colSpan={3} className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Total de itens em estoque</td>
                  <td className="p-4 font-bold text-emerald-700 dark:text-emerald-400">{totalFilteredItems.toLocaleString('pt-BR')} un.</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{filtered.length} medicamentos</td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Novo Medicamento</DialogTitle>
            <DialogDescription>Cadastre um medicamento no catálogo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Nome do medicamento</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Dipirona Sódica" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
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
              <Input value={draft.activeIngredient} onChange={(e) => setDraft({ ...draft, activeIngredient: e.target.value })} placeholder="Dipirona sódica" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Dosagem</Label>
              <Input value={draft.dosage} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} placeholder="500mg" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Descrição Acessível</Label>
              <Textarea value={draft.accessibleDesc} onChange={(e) => setDraft({ ...draft, accessibleDesc: e.target.value })} placeholder="Descrição simples do medicamento..." rows={3} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Medicine Detail Dialog */}
      <Dialog open={Boolean(selectedMedicine)} onOpenChange={() => setSelectedMedicine(null)}>
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
                  <Trash2 className="w-3.5 h-3.5" />Descartar
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
          <form onSubmit={handleEdit} className="space-y-4">
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
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={editLoading}>{editLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Descartar Medicamento"
        description={`Tem certeza que deseja descartar "${selectedMedicine?.name}"? Esta ação não pode ser desfeita. Se o medicamento possuir lotes ativos, o descarte será bloqueado.`}
        onConfirm={handleDelete}
        confirmLabel="Descartar"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
