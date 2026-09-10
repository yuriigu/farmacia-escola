'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ArrowUpRight, Plus, Download, Pill, Boxes, User, Clock, Eye, Search, X, Calendar
} from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/PharmacyStore';
import type { WithdrawalDraft, Withdrawal } from '@/lib/Types';
import { api } from '@/lib/Api';
import { downloadCSV, getAvatarColor, canWriteClient } from '@/lib/Constants';
import { useAuthStore } from '@/lib/AuthStore';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

export function WithdrawalsPage() {
  const { withdrawals, batches, loading } = usePharmacyStore();
  const { user } = useAuthStore();
  const userRole = user?.role;
  const userPerms = user?.permissions;
  const canWrite = canWriteClient(userRole, userPerms, 'withdrawals');
  let canExport = false;
  if (user) {
    if (user.role === 'ADMIN') {
      canExport = true;
    } else if (user.role === 'FARMACEUTICO') {
      canExport = true;
    }
  }
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<WithdrawalDraft>({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  useEffect(() => {
    fetchBatchesData().finally(() => setLoadingBatches(false));
  }, [fetchBatchesData, modalOpen]);

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  let overBalance = false;
  if (selectedBatch) {
    let currentQty = 0;
    if (selectedBatch.currentQuantity !== undefined && selectedBatch.currentQuantity !== null) {
      currentQty = selectedBatch.currentQuantity;
    }
    if (form.quantity > currentQty) {
      overBalance = true;
    }
  }

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      let patientName = '';
      if (w.patient) {
        if (w.patient.name) {
          patientName = w.patient.name;
        }
      }
      let cpf = '';
      if (w.patient) {
        if (w.patient.cpf) {
          cpf = w.patient.cpf;
        }
      }
      let medName = '';
      if (w.batch) {
        if (w.batch.medicine) {
          if (w.batch.medicine.name) {
            medName = w.batch.medicine.name;
          }
        }
      }
      let staffName = '';
      if (w.user) {
        if (w.user.name) {
          staffName = w.user.name;
        }
      }

      if (!searchTerm) {
        return true;
      }
      const searchLower = searchTerm.toLowerCase();
      if (patientName.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (cpf.includes(searchTerm)) {
        return true;
      }
      if (medName.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (staffName.toLowerCase().includes(searchLower)) {
        return true;
      }
      return false;
    });
  }, [withdrawals, searchTerm]);

  const handleExportCSV = () => {
    const header = ['Paciente', 'CPF', 'Medicamento', 'Dosagem', 'Quantidade', 'Dispensado por', 'Data/Hora'];
    const rows = filteredWithdrawals.map((w) => {
      let patientName = 'N/A';
      if (w.patient) {
        if (w.patient.name) {
          patientName = w.patient.name;
        }
      }
      let patientCpf = 'N/A';
      if (w.patient) {
        if (w.patient.cpf) {
          patientCpf = w.patient.cpf;
        }
      }
      let medName = 'N/A';
      if (w.batch) {
        if (w.batch.medicine) {
          if (w.batch.medicine.name) {
            medName = w.batch.medicine.name;
          }
        }
      }
      let medDosage = 'N/A';
      if (w.batch) {
        if (w.batch.medicine) {
          if (w.batch.medicine.dosage) {
            medDosage = w.batch.medicine.dosage;
          }
        }
      }
      let userName = 'N/A';
      if (w.user) {
        if (w.user.name) {
          userName = w.user.name;
        }
      }
      let dateStr = '-';
      if (w.createdAt) {
        dateStr = new Date(w.createdAt).toLocaleString('pt-BR');
      }
      return [
        patientName,
        patientCpf,
        medName,
        medDosage,
        String(w.quantity),
        userName,
        dateStr,
      ];
    });
    downloadCSV('retiradas_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      return;
    }
    if (selectedBatch.isBlocked) {
      toast.error('Este lote possui bloqueio sanitário ativo e não pode ser dispensado.');
      return;
    }
    if (overBalance) {
      return;
    }
    if (form.quantity <= 0) {
      return;
    }
    try {
      const res: any = await api.createWithdrawal(form);
      let successMsg = 'Retirada registrada com sucesso via FEFO!';
      if (res) {
        if (res.allocatedItems) {
          if (Array.isArray(res.allocatedItems)) {
            if (res.allocatedItems.length > 0) {
              const allocatedList: string[] = [];
              for (let i = 0; i < res.allocatedItems.length; i++) {
                const item = res.allocatedItems[i];
                let bName = 'Lote ' + item.batchId;
                if (item.batchNumber) {
                  bName = 'Lote ' + item.batchNumber;
                }
                allocatedList.push(bName + ' (' + item.quantity + ' un.)');
              }
              successMsg = 'Retirada confirmada com sucesso (FEFO)! Baixa automática: ' + allocatedList.join(', ');
            }
          }
        }
      }
      if (successMsg === 'Retirada registrada com sucesso via FEFO!') {
        if (selectedBatch) {
          successMsg = 'Retirada realizada com sucesso (FEFO)! Baixa de ' + form.quantity + ' un. no Lote ' + selectedBatch.batchNumber + '.';
        }
      }
      toast.success(successMsg);
      setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao registrar retirada.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    }
  };

  const columns: Column<Withdrawal>[] = [
    {
      header: 'Paciente',
      width: '220px',
      cell: (w) => {
        let pName = 'P';
        if (w.patient) {
          if (w.patient.name) {
            pName = w.patient.name;
          }
        }
        let firstLetter = 'P';
        if (pName.length > 0) {
          firstLetter = pName[0].toUpperCase();
        }
        let displayName = 'Não identificado';
        if (w.patient) {
          if (w.patient.name) {
            displayName = w.patient.name;
          }
        }
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
                pName
              )}`}
            >
              {firstLetter}
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
                {displayName}
              </p>
              {(() => {
                if (w.patient) {
                  if (w.patient.cpf) {
                    return (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{w.patient.cpf}</p>
                    );
                  }
                }
                return null;
              })()}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Medicamento / Lote',
      cell: (w) => {
        let medName = '';
        if (w.batch) {
          if (w.batch.medicine) {
            if (w.batch.medicine.name) {
              medName = w.batch.medicine.name;
            }
          }
        }
        let batchCode = '—';
        if (w.batch) {
          if (w.batch.code) {
            batchCode = w.batch.code;
          }
        }
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {medName}{' '}
                {(() => {
                  if (w.batch) {
                    if (w.batch.medicine) {
                      if (w.batch.medicine.dosage) {
                        return (
                          <span className="text-slate-400 font-normal">({w.batch.medicine.dosage})</span>
                        );
                      }
                    }
                  }
                  return null;
                })()}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Lote: {batchCode}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Quantidade',
      width: '130px',
      cell: (w) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {w.quantity} un.
        </span>
      ),
    },
    {
      header: 'Dispensado por',
      width: '160px',
      cell: (w) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {(() => {
              if (w.user) {
                if (w.user.name) {
                  return w.user.name;
                }
              }
              return 'Sistema';
            })()}
          </span>
        </div>
      ),
    },
    {
      header: 'Data / Hora',
      width: '160px',
      cell: (w) => {
        let date: Date | null = null;
        if (w.createdAt) {
          date = new Date(w.createdAt);
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {(() => {
                if (date) {
                  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                }
                return '—';
              })()}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Ações',
      width: '70px',
      align: 'right',
      cell: (w) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedWithdrawal(w)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Ver comprovante e detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Retiradas de Medicamentos"
        description="Controle e registro detalhado de dispensas gratuitas realizadas aos pacientes atendidos."
        icon={ArrowUpRight}
        actions={
          <>
            {(() => {
              if (canExport) {
                return (
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={filteredWithdrawals.length === 0}
                    className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar CSV</span>
                  </Button>
                );
              }
              return null;
            })()}
            {(() => {
              if (canWrite) {
                return (
                  <Button
                    onClick={() => {
                      setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
                      setModalOpen(true);
                    }}
                    className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar Retirada</span>
                  </Button>
                );
              }
              return null;
            })()}
          </>
        }
      />

      {/* Compact Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por paciente, CPF ou medicamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
          {(() => {
            if (searchTerm) {
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
        data={filteredWithdrawals}
        isLoading={loading}
        emptyIcon={ArrowUpRight}
        emptyTitle="Nenhuma retirada registrada"
        emptyDescription="Não há retiradas correspondentes aos critérios da busca."
        emptyAction={(() => {
          if (canWrite) {
            return (
              <Button
                onClick={() => {
                  setForm({ patientName: '', patientCpf: '', batchId: 0, quantity: 0, notes: '' });
                  setModalOpen(true);
                }}
                className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Retirada
              </Button>
            );
          }
          return undefined;
        })()}
        onRowClick={(w) => setSelectedWithdrawal(w)}
      />

      {/* Create Withdrawal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Registrar Retirada de Medicamento
            </DialogTitle>
            <DialogDescription>
              Informe o paciente e o lote para dar baixa e dispensar a medicação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Nome do Paciente *
                </Label>
                <Input
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  CPF do Paciente *
                </Label>
                <Input
                  value={form.patientCpf}
                  onChange={(e) => setForm({ ...form, patientCpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Lote de Medicamento *
              </Label>
              <Select
                value={(() => {
                  if (form.batchId) {
                    return String(form.batchId);
                  }
                  return '';
                })()}
                onValueChange={(v) => setForm({ ...form, batchId: Number(v) })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                  <SelectValue
                    placeholder={(() => {
                      if (loadingBatches) {
                        return 'Carregando lotes...';
                      }
                      return 'Selecione um lote...';
                    })()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {batches
                    .filter((b) => {
                      if (b.isBlocked) {
                        return false;
                      }
                      if (b.currentQuantity <= 0) {
                        return false;
                      }
                      return true;
                    })
                    .map((b) => {
                      let mName = '';
                      let mDosage = '';
                      if (b.medicine) {
                        if (b.medicine.name) {
                          mName = b.medicine.name;
                        }
                        if (b.medicine.dosage) {
                          mDosage = b.medicine.dosage;
                        }
                      }
                      return (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {mName} ({mDosage}) • Lote {b.batchNumber} - {b.currentQuantity} un.
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade a Dispensar *
              </Label>
              <Input
                type="number"
                min={1}
                max={(() => {
                  if (selectedBatch) {
                    return selectedBatch.currentQuantity;
                  }
                  return undefined;
                })()}
                value={(() => {
                  if (form.quantity) {
                    return form.quantity;
                  }
                  return '';
                })()}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                placeholder="0"
                required
                className={(() => {
                  let cls = 'rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 ';
                  if (overBalance) {
                    cls = cls + 'border-rose-500 focus:ring-rose-500';
                  }
                  return cls;
                })()}
              />
              {(() => {
                if (overBalance) {
                  let maxQty = 0;
                  if (selectedBatch) {
                    maxQty = selectedBatch.currentQuantity;
                  }
                  return (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      Quantidade superior ao saldo ({maxQty} un.).
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Observações / Prescrição
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Número da receita, posologia ou observações..."
                rows={2}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={(() => {
                  if (!selectedBatch) {
                    return true;
                  }
                  if (overBalance) {
                    return true;
                  }
                  if (form.quantity <= 0) {
                    return true;
                  }
                  return false;
                })()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Concluir Retirada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Details Dialog */}
      <Dialog
        open={(() => {
          if (selectedWithdrawal) {
            return true;
          }
          return false;
        })()}
        onOpenChange={() => setSelectedWithdrawal(null)}
      >
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              Comprovante de Retirada
            </DialogTitle>
            <DialogDescription>Detalhes do atendimento e registro de dispensa</DialogDescription>
          </DialogHeader>

          {(() => {
            if (selectedWithdrawal) {
              let patName = '—';
              let patCpf = '—';
              if (selectedWithdrawal.patient) {
                if (selectedWithdrawal.patient.name) {
                  patName = selectedWithdrawal.patient.name;
                }
                if (selectedWithdrawal.patient.cpf) {
                  patCpf = selectedWithdrawal.patient.cpf;
                }
              }
              let medName = '—';
              let medDosage = '—';
              let batchCode = '—';
              if (selectedWithdrawal.batch) {
                if (selectedWithdrawal.batch.medicine) {
                  if (selectedWithdrawal.batch.medicine.name) {
                    medName = selectedWithdrawal.batch.medicine.name;
                  }
                  if (selectedWithdrawal.batch.medicine.dosage) {
                    medDosage = selectedWithdrawal.batch.medicine.dosage;
                  }
                }
                if (selectedWithdrawal.batch.code) {
                  batchCode = selectedWithdrawal.batch.code;
                }
              }
              let userName = 'Sistema';
              if (selectedWithdrawal.user) {
                if (selectedWithdrawal.user.name) {
                  userName = selectedWithdrawal.user.name;
                }
              }
              let dateStr = '—';
              if (selectedWithdrawal.createdAt) {
                dateStr = new Date(selectedWithdrawal.createdAt).toLocaleString('pt-BR');
              }
              return (
                <div className="space-y-3 pt-2 text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Paciente:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{patName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">CPF:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{patCpf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Medicamento:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {medName} ({medDosage})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Lote:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{batchCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Quantidade:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedWithdrawal.quantity} unidades</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Atendente:</span>
                      <span className="text-slate-800 dark:text-slate-200">{userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Data e Hora:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    if (selectedWithdrawal.notes) {
                      return (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Observações</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{selectedWithdrawal.notes}</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            }
            return null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}