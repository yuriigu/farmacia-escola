'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Undo2, Download, Package, Calendar, User, Search, X } from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/PharmacyStore';
import type { DisposalDraft, Disposal } from '@/lib/Types';
import { api } from '@/lib/Api';
import { downloadCSV } from '@/lib/Constants';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export function DisposalsPage() {
  const { disposals, batches, loading } = usePharmacyStore();
  const canWrite = usePermission('DISPOSALS_CREATE');
  const [modalOpen, setModalOpen] = useState(false);
  const [reverting, setReverting] = useState<number | null>(null);
  const [selectedDisposal, setSelectedDisposal] = useState<Disposal | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<DisposalDraft>({ batchId: 0, quantity: 0, reason: 'EXPIRED', notes: '' });

  const REASONS = [
    { value: 'EXPIRED', label: 'Vencimento' },
    { value: 'DAMAGED_PACKAGING', label: 'Embalagem Danificada' },
    { value: 'CONTAMINATION', label: 'Contaminação' },
    { value: 'RECALL', label: 'Recall do Fabricante' },
    { value: 'STORAGE_ERROR', label: 'Erro de Armazenamento/Refrigeração' },
    { value: 'OTHER', label: 'Outros' },
  ];

  useEffect(() => {
    fetchBatchesData().finally(() => {
      setLoadingBatches(false);
    });
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => {
    if (b.id === form.batchId) {
      return true;
    }
    return false;
  });

  let overBalance = false;
  if (selectedBatch) {
    let currentQty = 0;
    if (selectedBatch.currentQuantity) {
      currentQty = selectedBatch.currentQuantity;
    }
    if (form.quantity > currentQty) {
      overBalance = true;
    } else {
      overBalance = false;
    }
  } else {
    overBalance = false;
  }

  const filteredDisposals = useMemo(() => {
    return disposals.filter((d) => {
      let medName = '';
      if (d.batch) {
        if (d.batch.medicine) {
          if (d.batch.medicine.name) {
            medName = d.batch.medicine.name;
          }
        }
      }

      let batchCode = '';
      if (d.batch) {
        if (d.batch.code) {
          batchCode = d.batch.code;
        }
      }

      let reason = '';
      if (d.reason) {
        reason = d.reason;
      }

      let user = '';
      if (d.user) {
        if (d.user.name) {
          user = d.user.name;
        }
      }

      if (searchTerm.length === 0) {
        return true;
      }

      const term = searchTerm.toLowerCase();
      if (medName.toLowerCase().includes(term)) {
        return true;
      }
      if (batchCode.toLowerCase().includes(term)) {
        return true;
      }
      if (reason.toLowerCase().includes(term)) {
        return true;
      }
      if (user.toLowerCase().includes(term)) {
        return true;
      }
      return false;
    });
  }, [disposals, searchTerm]);

  const handleExportCSV = () => {
    const header = ['Medicamento', 'Lote', 'Quantidade', 'Motivo', 'Registrado por', 'Data', 'Revertido'];
    const rows = filteredDisposals.map((d) => {
      let dateStr = '-';
      if (d.createdAt) {
        dateStr = new Date(d.createdAt).toLocaleDateString('pt-BR');
      }

      let revertedStr = 'Não';
      if (d.status === 'REVERTED') {
        revertedStr = 'Sim';
      } else {
        revertedStr = 'Não';
      }

      return [
        d.batch.medicine.name,
        d.batch.code,
        String(d.quantity),
        d.reason,
        d.user.name,
        dateStr,
        revertedStr,
      ];
    });
    downloadCSV('descartes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      return;
    }
    if (overBalance) {
      return;
    }
    if (form.quantity <= 0) {
      return;
    }
    try {
      await api.createDisposal(form);
      toast.success('Descarte registrado com sucesso.');
      setForm({ batchId: 0, quantity: 0, reason: REASONS[0].value, notes: '' });
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao registrar descarte.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    }
  };

  const handleRevert = async (id: number) => {
    if (!revertReason.trim()) {
      toast.error('Informe a justificativa da reversão.');
      return;
    }
    try {
      await api.revertDisposal(id, revertReason.trim());
      toast.success('Descarte revertido com sucesso.');
      setReverting(null);
      setRevertReason('');
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao reverter descarte.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
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
              Lote: {d.batch.batchNumber}
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
          {(() => {
            const selectedReason = REASONS.find((reasonItem) => reasonItem.value === d.reason);
            if (selectedReason) {
              return selectedReason.label;
            }
            return d.reason;
          })()}
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
        let dateText = '—';
        if (d.createdAt) {
          const date = new Date(d.createdAt);
          dateText = date.toLocaleDateString('pt-BR');
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{dateText}</span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '120px',
      cell: (d) => {
        let badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px]';
        let badgeText = 'Descartado';
        if (d.status === 'REVERTED') {
          badgeClass = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 text-[10px]';
          badgeText = 'Revertido';
        } else {
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px]';
          badgeText = 'Descartado';
        }

        return (
          <Badge
            variant="outline"
            className={badgeClass}
          >
            {badgeText}
          </Badge>
        );
      },
    },
    {
      header: 'Ações',
      width: '100px',
      align: 'right',
      cell: (d) => {
        if (canWrite && d.status !== 'REVERTED') {
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRevertReason('');
                setReverting(d.id);
              }}
              className="h-8 px-2 rounded-lg text-xs gap-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              title="Reverter descarte"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Reverter</span>
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Registro de Descartes"
        description="Histórico e rastreabilidade do descarte seguro de insumos e medicamentos vencidos ou avariados."
        icon={Trash2}
        actions={
          <>
            {canWrite && <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredDisposals.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>}
            {canWrite && <Button
              onClick={() => {
                setForm({ batchId: 0, quantity: 0, reason: REASONS[0].value, notes: '' });
                setModalOpen(true);
              }}
              className="h-10 rounded-xl gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Descarte</span>
            </Button>}
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
          {(() => {
            if (searchTerm.length > 0) {
              return (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              );
            }
            return null;
          })()}
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
        emptyAction={canWrite ? (
          <Button
            onClick={() => {
              setForm({ batchId: 0, quantity: 0, reason: REASONS[0].value, notes: '' });
              setModalOpen(true);
            }}
            className="h-9 rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Descarte
          </Button>
        ) : undefined}
        onRowClick={(disposal) => setSelectedDisposal(disposal)}
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
              {(() => {
                let batchVal = '';
                if (form.batchId) {
                  batchVal = String(form.batchId);
                }

                let batchPlaceholder = 'Selecione um lote...';
                if (loadingBatches) {
                  batchPlaceholder = 'Carregando lotes...';
                }

                return (
                  <Select
                    value={batchVal}
                    onValueChange={(v) => setForm({ ...form, batchId: Number(v) })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                      <SelectValue placeholder={batchPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {batches
                        .filter((b) => b.currentQuantity > 0)
                        .map((b) => {
                          let medNameLabel = '';
                          if (b.medicine) {
                            if (b.medicine.name) {
                              medNameLabel = b.medicine.name;
                            }
                          }
                          return (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {medNameLabel} • Lote {b.batchNumber} ({b.currentQuantity} un.)
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade a Descartar *
              </Label>
              {(() => {
                let maxQty: number | undefined = undefined;
                if (selectedBatch) {
                  maxQty = selectedBatch.currentQuantity;
                }

                let formQtyVal: string | number = '';
                if (form.quantity) {
                  formQtyVal = form.quantity;
                }

                let overBalanceInputClass = '';
                if (overBalance) {
                  overBalanceInputClass = 'border-rose-500 focus:ring-rose-500';
                }

                return (
                  <Input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={formQtyVal}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    placeholder="0"
                    required
                    className={'rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 ' + overBalanceInputClass}
                  />
                );
              })()}
              {(() => {
                if (overBalance) {
                  let availQty = 0;
                  if (selectedBatch) {
                    availQty = selectedBatch.currentQuantity;
                  }
                  return (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      Quantidade maior que o saldo disponível ({availQty} un.).
                    </p>
                  );
                }
                return null;
              })()}
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
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              {(() => {
                let isSubmitDisabled = false;
                if (!selectedBatch) {
                  isSubmitDisabled = true;
                } else if (overBalance) {
                  isSubmitDisabled = true;
                } else if (form.quantity <= 0) {
                  isSubmitDisabled = true;
                }

                return (
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    Confirmar Descarte
                  </Button>
                );
              })()}
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
          <Textarea
            value={revertReason}
            onChange={(event) => setRevertReason(event.target.value)}
            placeholder="Justificativa obrigatória da reversão"
            rows={4}
          />
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setReverting(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (reverting) {
                  handleRevert(reverting);
                }
              }}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Sim, Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedDisposal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDisposal(null);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-600" />
              Comprovante de Descarte
            </DialogTitle>
            <DialogDescription>Registro de inutilização e baixa de estoque</DialogDescription>
          </DialogHeader>
          {(() => {
            if (!selectedDisposal) {
              return null;
            }
            let medicineName = 'Não informado';
            let batchNumber = 'Não informado';
            let expirationDate = 'Não informado';
            let professionalName = 'Não informado';
            let notes = 'Nenhuma observação adicional';
            let timestamp = 'Não informado';
            let reasonLabel = selectedDisposal.reason;
            let statusLabel = 'Descartado';
            let statusClass = 'bg-rose-50 text-rose-700 border-rose-200';

            if (selectedDisposal.batch) {
              if (selectedDisposal.batch.medicine) {
                if (selectedDisposal.batch.medicine.name) {
                  medicineName = selectedDisposal.batch.medicine.name;
                }
              }
              if (selectedDisposal.batch.batchNumber) {
                batchNumber = selectedDisposal.batch.batchNumber;
              } else {
                if (selectedDisposal.batch.code) {
                  batchNumber = selectedDisposal.batch.code;
                }
              }
              if (selectedDisposal.batch.expirationDate) {
                expirationDate = new Date(selectedDisposal.batch.expirationDate).toLocaleDateString('pt-BR');
              } else {
                if (selectedDisposal.batch.expiresAt) {
                  expirationDate = new Date(selectedDisposal.batch.expiresAt).toLocaleDateString('pt-BR');
                }
              }
            }
            if (selectedDisposal.user) {
              if (selectedDisposal.user.name) {
                professionalName = selectedDisposal.user.name;
              }
            }
            if (selectedDisposal.notes) {
              notes = selectedDisposal.notes;
            }
            const selectedReason = REASONS.find((reasonItem) => reasonItem.value === selectedDisposal.reason);
            if (selectedReason) {
              reasonLabel = selectedReason.label;
            }
            if (selectedDisposal.createdAt) {
              timestamp = new Date(selectedDisposal.createdAt).toLocaleString('pt-BR');
            }
            if (selectedDisposal.status === 'REVERTED') {
              statusLabel = 'Revertido';
              statusClass = 'bg-slate-100 text-slate-600 border-slate-300';
            }

            return (
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-400">Status</span>
                  <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                </div>
                <div className="grid gap-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Medicamento</span><span className="font-semibold text-right">{medicineName}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Lote</span><span className="font-mono text-right">{batchNumber}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Validade</span><span className="text-right">{expirationDate}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Quantidade</span><span className="font-bold text-rose-600">{selectedDisposal.quantity} unidades</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Motivo</span><span className="font-semibold text-right">{reasonLabel}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Profissional</span><span className="text-right">{professionalName}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-xs text-slate-400">Data e hora</span><span className="text-right">{timestamp}</span></div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Observações</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{notes}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}