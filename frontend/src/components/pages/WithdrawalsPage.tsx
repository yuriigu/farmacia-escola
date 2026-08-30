'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, Plus, Download, Pill, Boxes, User, Clock, FileText, Eye } from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import type { WithdrawalDraft, Withdrawal } from '@/lib/types';
import { api } from '@/lib/api';
import { downloadCSV, getAvatarColor, canWriteClient } from '@/lib/constants';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function WithdrawalsPage() {
  const { withdrawals, batches } = usePharmacyStore();
  const { user } = useAuthStore();
  const canWrite = canWriteClient(user?.role, user?.permissions, 'withdrawals');
  const canExport = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [form, setForm] = useState<WithdrawalDraft>({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  useEffect(() => {
    fetchBatchesData().finally(() => setLoadingBatches(false));
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const overBalance = Boolean(selectedBatch) && form.quantity > (selectedBatch?.currentQuantity ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || overBalance || form.quantity <= 0) return;
    try {
      await api.createWithdrawal(form);
      toast.success('Retirada registrada com sucesso!');
      setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao registrar retirada.');
    }
  };

  // Função auxiliar para obter o código do lote
  const getBatchCode = (withdrawal: Withdrawal) => {
    // O tipo Batch expõe o campo 'code' para identificar o lote
    return withdrawal.batch?.code || withdrawal.batch?.id?.toString() || 'N/A';
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header-bar pb-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600"><ArrowUpRight className="w-5 h-5" /></div>
            Retiradas de Medicamentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dispensa direta e fornecimento ao paciente • {withdrawals.length} registradas</p>
        </div>
        {(canWrite || canExport) && (
        <div className="flex items-center gap-2">
          {canExport && (
          <Button variant="outline" onClick={() => {
            const header = ['Paciente', 'CPF', 'Medicamento', 'Dosagem', 'Quantidade', 'Dispensado por', 'Data/Hora'];
            const rows = withdrawals.map((w) => [
              w.patient?.name || 'N/A', 
              w.patient?.cpf || 'N/A', 
              w.batch?.medicine?.name || 'N/A', 
              w.batch?.medicine?.dosage || 'N/A', 
              String(w.quantity), 
              w.user?.name || 'N/A', 
              w.createdAt ? new Date(w.createdAt).toLocaleString('pt-BR') : '-'
            ]);
            downloadCSV('retiradas_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
            toast.success('Relatório exportado com sucesso!');
          }} disabled={withdrawals.length === 0} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4" />Exportar CSV
          </Button>
          )}
          {canWrite && (
          <Button onClick={() => { setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' }); setModalOpen(true); }} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Registrar Retirada
          </Button>
          )}
        </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[700px]">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
                <tr>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Medicamento Entregue</th>
                  <th className="p-4">Quantidade</th>
                  <th className="p-4">Dispensado por</th>
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={6} className="p-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 flex items-center justify-center mb-4">
                        <ArrowUpRight className="w-10 h-10 text-amber-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhuma retirada registrada</p>
                      <p className="text-xs text-slate-400 mt-1">Registre a primeira retirada de medicamento.</p>
                    </div>
                  </td></tr>
                ) : (
                  withdrawals.map((w, idx) => {
                    // Verificação de segurança para evitar o erro
                    const medicineName = w.batch?.medicine?.name || 'Medicamento não disponível';
                    const medicineDosage = w.batch?.medicine?.dosage || 'N/A';
                    const patientName = w.patient?.name || 'Paciente não identificado';
                    const patientCpf = w.patient?.cpf || 'N/A';
                    const userName = w.user?.name || 'Usuário não identificado';

                    return (
                      <tr key={w.id} className={(idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30 ' : '') + 'table-row-hover'}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(patientName)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                              {patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{patientName}</p>
                              <p className="text-xs text-slate-400 font-mono">{patientCpf}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-emerald-800 dark:text-emerald-300">
                          {medicineName} 
                          <span className="text-slate-400 font-normal">({medicineDosage})</span>
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{w.quantity} un.</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{userName}</td>
                        <td className="p-4 text-xs text-slate-400">{w.createdAt ? new Date(w.createdAt).toLocaleString('pt-BR') : '-'}</td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedWithdrawal(w)} className="rounded-lg h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Detail Dialog */}
      <Dialog open={Boolean(selectedWithdrawal)} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              Detalhes da Retirada
            </DialogTitle>
            <DialogDescription>Informações completas da dispensa de medicamento</DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              {/* Patient info */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedWithdrawal.patient?.name || 'P')} text-white flex items-center justify-center font-bold`}>
                    {(selectedWithdrawal.patient?.name || 'P').charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{selectedWithdrawal.patient?.name || 'Paciente não identificado'}</p>
                    <p className="text-xs text-slate-400 font-mono">{selectedWithdrawal.patient?.cpf || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Medicine info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Pill className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Medicamento</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {selectedWithdrawal.batch?.medicine?.name || 'Medicamento não disponível'}
                  </p>
                  <p className="text-xs text-slate-400">{selectedWithdrawal.batch?.medicine?.dosage || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Boxes className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Lote</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedWithdrawal.batch?.code || selectedWithdrawal.batch?.id?.toString() || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{selectedWithdrawal.quantity} un.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispensado por</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedWithdrawal.user?.name || 'Usuário não identificado'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data / Hora</p>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedWithdrawal.createdAt ? new Date(selectedWithdrawal.createdAt).toLocaleString('pt-BR') : '—'}
                </p>
              </div>

              {selectedWithdrawal.notes && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Observações</p>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{selectedWithdrawal.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Retirada de Medicamento</DialogTitle>
            <DialogDescription>Registre a entrega ao paciente. Se o CPF já estiver cadastrado, a retirada é vinculada automaticamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Paciente</Label>
                <Input required value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Nome do paciente" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">CPF</Label>
                <Input required value={form.patientCpf} onChange={(e) => setForm({ ...form, patientCpf: e.target.value })} placeholder="000.000.000-00" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Lote do Medicamento</Label>
              <Select value={form.batchId ? String(form.batchId) : ''} onValueChange={(v) => setForm({ ...form, batchId: Number(v) })}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" disabled={loadingBatches}>
                  <SelectValue placeholder={loadingBatches ? 'Carregando lotes...' : 'Selecione um lote...'} />
                </SelectTrigger>
                <SelectContent>
                  {batches.filter((b) => b.currentQuantity > 0).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.medicine?.name || 'Medicamento'} {b.medicine?.dosage || ''} — Lote {b.batchNumber || b.id} — saldo: {b.currentQuantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBatch && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Saldo disponível: <span className="font-medium">{selectedBatch.currentQuantity}</span></p>
              )}
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Quantidade a retirar</Label>
              <Input type="number" min={1} max={selectedBatch?.currentQuantity} required value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              {overBalance && <p className="text-xs text-rose-600 mt-1">Quantidade maior que o saldo disponível.</p>}
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Orientações dadas ao paciente..." className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={overBalance || !selectedBatch} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Registrar Retirada</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}