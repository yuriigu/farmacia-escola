'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/lib/toast-handler';
import { z } from 'zod';
import {
  Boxes, Plus, Search, Pencil, Trash2, Eye, X, Calendar, Download,
  ShieldAlert, ShieldCheck, SlidersHorizontal, AlertTriangle
} from 'lucide-react';
import { usePharmacyStore, fetchAllData, fetchBatchesData } from '@/lib/pharmacy-store';
import { type BatchEntryDraft, type Batch, type StockStatus } from '@/types';
import { StockStatusBadge } from '@/components/shared/stock-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/types';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/constants';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field-error';

// schema do formulario de novo lote. valida os campos obrigatorios
// antes de mandar pra api (nome, quantidade, validade, fornecedor).
const batchDraftSchema = z.object({
  medicineId: z.number().min(1, 'Selecione um medicamento'),
  batchNumber: z.string().min(2, 'Informe o número do lote'),
  currentQuantity: z.number().min(1, 'A quantidade deve ser maior que zero'),
  expirationDate: z.string().min(1, 'Informe a data de validade'),
  manufacturingDate: z.string().optional(),
  supplier: z.string().min(2, 'Informe o fornecedor/origem'),
});

// pagina de gestao de estoque de lotes. e a tela que cadastra
// novas remessas, lista o estoque atual com filtros de status,
// mostra o historico de movimentacoes de cada lote e oferece as
// operacoes sensiveis: bloqueio sanitario e ajuste auditado.
// tudo isso controlado pela permissao batches_create.
export function StockManagementPage() {
  const { medicines, batches, appointments, disposals, loading } = usePharmacyStore();
  const canWrite = usePermission('BATCHES_CREATE');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BatchEntryDraft>({
    medicineId: 0,
    batchNumber: '',
    currentQuantity: 0,
    expirationDate: '',
    manufacturingDate: '',
    supplier: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ batchNumber: '', currentQuantity: 0, expirationDate: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // estados do dialog de bloqueio/desbloqueio sanitario.
  const [blockOpen, setBlockOpen] = useState(false);
  const [batchToBlock, setBatchToBlock] = useState<Batch | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);

  // estados do dialog de ajuste auditado de estoque.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [batchToAdjust, setBatchToAdjust] = useState<Batch | null>(null);
  const [adjustNewQuantity, setAdjustNewQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // carrega os lotes uma vez ao montar.
  useEffect(() => {
    fetchBatchesData();
  }, []);

  // deriva o status do lote a partir de bloqueio, validade e saldo.
  // a ordem das checagens: bloqueado > vencido > esgotado > ativo.
  const getBatchStatus = (batch: Batch): StockStatus => {
    if (batch.isBlocked) {
      return 'Bloqueado';
    }
    const exp = new Date(batch.expirationDate);
    const now = new Date();
    if (exp.getTime() < now.getTime()) {
      return 'Vencido';
    }
    if (batch.currentQuantity <= 0) {
      return 'Esgotado';
    }
    return 'Ativo';
  };

  // filtro da lista por busca (lote ou medicamento) e por status.
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      let matchesSearch = false;
      if (!batchSearch) {
        matchesSearch = true;
      } else {
        const searchLower = batchSearch.toLowerCase();
        if (b.batchNumber.toLowerCase().includes(searchLower)) {
          matchesSearch = true;
        } else if (b.medicine) {
          if (b.medicine.name) {
            if (b.medicine.name.toLowerCase().includes(searchLower)) {
              matchesSearch = true;
            }
          }
        }
      }
      const status = getBatchStatus(b);
      let matchesStatus = false;
      if (batchStatusFilter === 'all') {
        matchesStatus = true;
      } else if (status === batchStatusFilter) {
        matchesStatus = true;
      }
      if (matchesSearch) {
        if (matchesStatus) {
          return true;
        }
      }
      return false;
    });
  }, [batches, batchSearch, batchStatusFilter]);

  // dispensacoes ligadas ao lote selecionado. cobre tanto o batchid
  // direto na consulta quanto os itens que apontam pra esse lote.
  const batchDispenses = useMemo(() => {
    if (!selectedBatch) {
      return [];
    }
    return appointments.filter((app) => {
      if (app.status === 'COMPLETED') {
        if (app.batchId === selectedBatch.id) {
          return true;
        }
        if (app.items) {
          const hasBatch = app.items.some((item) => {
            if (item.batchId === selectedBatch.id) {
              return true;
            }
            return false;
          });
          if (hasBatch) {
            return true;
          }
        }
      }
      return false;
    });
  }, [selectedBatch, appointments]);

  // descartes ligados ao lote selecionado.
  const batchDisposals = useMemo(() => {
    if (!selectedBatch) return [];
    return disposals.filter((d) => {
      if (d.batch) {
        if (d.batch.id === selectedBatch.id) {
          return true;
        }
      }
      return false;
    });
  }, [selectedBatch, disposals]);

  // junta dispensacoes e descartes numa lista unica ordenada por data
  // desc, formatada pro painel de historico do lote.
  const batchHistory = useMemo(() => {
    const items: { type: 'dispense' | 'disposal'; date: string; description: string; userName: string; quantity: number }[] = [];
    batchDispenses.forEach((app) => {
      let patName = 'Paciente';
      if (app.patient) {
        if (app.patient.name) {
          patName = app.patient.name;
        }
      }
      let userName = 'Sistema';
      if (app.dispensedByUser) {
        if (app.dispensedByUser.name) {
          userName = app.dispensedByUser.name;
        }
      }
      // soma as quantidades dos itens que apontam pro lote.
      let totalQty = 0;
      if (app.items) {
        app.items.forEach((it) => {
          if (it.batchId === selectedBatch?.id) {
            totalQty = totalQty + it.quantity;
          }
        });
      }
      // fallback quando o item nao tem batchid explicito.
      if (totalQty === 0) {
        totalQty = 1;
      }
      // data da dispensacao: prioriza dispensedat, cai pra createdat
      // e por ultimo usa agora.
      let dispDate = app.updatedAt;
      if (app.dispensedAt) {
        dispDate = app.dispensedAt;
      } else if (app.createdAt) {
        dispDate = app.createdAt;
      }
      let finalDate = '';
      if (dispDate) {
        finalDate = dispDate;
      } else {
        finalDate = new Date().toISOString();
      }
      items.push({
        type: 'dispense',
        date: finalDate,
        description: `Dispensação: ${patName} (${totalQty} un.)`,
        userName: userName,
        quantity: totalQty,
      });
    });
    batchDisposals.forEach((d) => {
      let userName = 'Sistema';
      if (d.user) {
        if (d.user.name) {
          userName = d.user.name;
        }
      }
      items.push({
        type: 'disposal',
        date: d.createdAt,
        description: `Descarte: ${d.reason} (${d.quantity} un.)`,
        userName: userName,
        quantity: d.quantity,
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batchDispenses, batchDisposals, selectedBatch]);

  // exporta em csv os lotes filtrados.
  const handleExportCSV = () => {
    const header = ['Número do Lote', 'Medicamento', 'Dosagem', 'Quantidade', 'Data de Validade', 'Status'];
    const rows = filteredBatches.map((b) => {
      const status = getBatchStatus(b);
      // traduz o status do card pro label do csv.
      let statusLabel = 'Vencido';
      if (status === 'ok') {
        statusLabel = 'Em dia';
      } else if (status === 'low') {
        statusLabel = 'Baixo';
      } else if (status === 'critical') {
        statusLabel = 'Crítico';
      }
      let medName = 'N/A';
      if (b.medicine) {
        if (b.medicine.name) {
          medName = b.medicine.name;
        }
      }
      let medDosage = 'N/A';
      if (b.medicine) {
        if (b.medicine.dosage) {
          medDosage = b.medicine.dosage;
        }
      }
      let expStr = '-';
      if (b.expirationDate) {
        expStr = new Date(b.expirationDate).toLocaleDateString('pt-BR');
      }
      return [
        b.batchNumber,
        medName,
        medDosage,
        String(b.currentQuantity),
        expStr,
        statusLabel,
      ];
    });
    downloadCSV('estoque_lotes_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório de lotes exportado com sucesso!');
  };

  // submit do formulario de novo lote. valida pelo zod antes de
  // chamar a api.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = batchDraftSchema.safeParse(form);
    if (!validation.success) {
      const errors = Object.fromEntries(validation.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      setFieldErrors(errors);
      const firstInvalidField = validation.error.issues[0]?.path[0];
      if (typeof firstInvalidField === 'string') document.getElementById(`stock-${firstInvalidField}`)?.focus();
      return;
    }
    setFieldErrors({});
    try {
      // chamamos o cliente http (/lib/api) pra criar o lote. o
      // backend tambem registra a movimentacao de entrada.
      await api.createBatch(form);
      toast.success('Lote registrado com sucesso no estoque!');
      setForm({
        medicineId: 0,
        batchNumber: '',
        currentQuantity: 0,
        expirationDate: '',
        manufacturingDate: '',
        supplier: '',
      });
      setCreateOpen(false);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao registrar lote.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    }
  };

  // abre o dialog de bloqueio/desbloqueio, pre-preenchendo o motivo
  // quando ja existe um (caso de desbloqueio).
  const openBlockDialog = (batch: Batch) => {
    setFieldErrors((current) => ({ ...current, blockReason: '' }));
    setBatchToBlock(batch);
    let reason = '';
    if (batch.blockReason) {
      reason = batch.blockReason;
    }
    setBlockReason(reason);
    setBlockOpen(true);
  };

  // confirma o bloqueio/desbloqueio. o alvo e sempre o inverso do
  // estado atual. bloqueio exige motivo; desbloqueio manda null.
  const handleBlockConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchToBlock) return;
    // inverte o estado atual: se estava bloqueado, vai desbloquear.
    let targetBlocked = true;
    if (batchToBlock.isBlocked) {
      targetBlocked = false;
    } else {
      targetBlocked = true;
    }
    // motivo so obrigatorio quando esta bloqueando.
    if (targetBlocked) {
      if (!blockReason.trim()) {
        setFieldErrors((current) => ({ ...current, blockReason: 'Informe o motivo do bloqueio sanitário.' }));
        document.getElementById('stock-blockReason')?.focus();
        return;
      }
    }
    setFieldErrors((current) => ({ ...current, blockReason: '' }));
    setBlockLoading(true);
    try {
      let reasonToSend: string | null = null;
      if (targetBlocked) {
        reasonToSend = blockReason.trim();
      } else {
        reasonToSend = null;
      }
      // chamamos o cliente http (/lib/api) pra alternar o bloqueio.
      await api.blockBatch(batchToBlock.id, {
        isBlocked: targetBlocked,
        blockReason: reasonToSend,
      });
      if (targetBlocked) {
        toast.success('Lote bloqueado com sucesso!');
      } else {
        toast.success('Lote desbloqueado com sucesso!');
      }
      setBlockOpen(false);
      setBatchToBlock(null);
      setBlockReason('');
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao alterar status de bloqueio do lote.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setBlockLoading(false);
    }
  };

  // abre o dialog de ajuste auditado, com o saldo atual preenchido.
  const openAdjustDialog = (batch: Batch) => {
    setFieldErrors((current) => ({ ...current, adjustQuantity: '', adjustReason: '' }));
    setBatchToAdjust(batch);
    setAdjustNewQuantity(batch.currentQuantity);
    setAdjustReason('');
    setAdjustOpen(true);
  };

  // confirma o ajuste de estoque. exige justificativa, porque toda
  // alteracao de saldo precisa ficar rastreada.
  const handleAdjustConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchToAdjust) return;
    if (adjustNewQuantity < 0) {
      setFieldErrors((current) => ({ ...current, adjustQuantity: 'A nova quantidade não pode ser negativa.' }));
      document.getElementById('stock-adjustQuantity')?.focus();
      return;
    }
    if (!adjustReason.trim()) {
      setFieldErrors((current) => ({ ...current, adjustReason: 'A justificativa do ajuste é obrigatória.' }));
      document.getElementById('stock-adjustReason')?.focus();
      return;
    }
    setFieldErrors((current) => ({ ...current, adjustQuantity: '', adjustReason: '' }));
    setAdjustLoading(true);
    try {
      // chamamos o cliente http (/lib/api) pra aplicar o ajuste
      // auditado. a api registra a movimentacao e o log.
      await api.adjustBatch(batchToAdjust.id, {
        newQuantity: adjustNewQuantity,
        reason: adjustReason.trim(),
      });
      toast.success('Ajuste de estoque registrado com sucesso!');
      setAdjustOpen(false);
      setBatchToAdjust(null);
      setAdjustReason('');
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao realizar ajuste de estoque.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setAdjustLoading(false);
    }
  };

  // abre o dialog de edicao, pre-preenchendo com os dados do lote.
  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setEditForm({
      batchNumber: batch.batchNumber,
      currentQuantity: batch.currentQuantity,
      expirationDate: batch.expirationDate.slice(0, 10),
    });
    setEditOpen(true);
  };

  // salva a edicao do lote. o backend so aceita numero, quantidade
  // e validade (o resto e imutavel).
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setEditLoading(true);
    try {
      // chamamos o cliente http (/lib/api) pra aplicar a edicao.
      await api.updateBatch(selectedBatch.id, editForm);
      toast.success('Lote atualizado com sucesso!');
      setEditOpen(false);
      setSelectedBatch(null);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao atualizar lote.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setEditLoading(false);
    }
  };

  // exclui um lote. o backend bloqueia se houver movimentacoes ou
  // descartes vinculados (integridade referencial).
  const handleDelete = async () => {
    if (!selectedBatch) return;
    setDeleteLoading(true);
    try {
      // chamamos o cliente http (/lib/api) pra excluir.
      await api.deleteBatch(selectedBatch.id);
      toast.success('Lote excluído com sucesso!');
      setDeleteOpen(false);
      setSelectedBatch(null);
      fetchAllData();
      fetchBatchesData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Não é possível excluir: o lote possui movimentações associadas.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // colunas da tabela de lotes.
  const columns: Column<Batch>[] = [
    {
      header: 'Lote',
      width: '180px',
      cell: (batch) => (
        // numero do lote com badge de bloqueado quando aplicavel,
        // + id interno discreto.
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-mono leading-tight">
                {batch.batchNumber}
              </p>
              {(() => {
                if (batch.isBlocked) {
                  return (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                      BLOQUEADO
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-[10px] text-slate-400">ID #{batch.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Medicamento',
      cell: (batch) => (
        // nome do medicamento + dosagem embaixo.
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {(() => {
              if (batch.medicine) {
                if (batch.medicine.name) {
                  return batch.medicine.name;
                }
              }
              return 'Medicamento não identificado';
            })()}
          </p>
          {(() => {
            if (batch.medicine) {
              if (batch.medicine.dosage) {
                return (
                  <p className="text-[11px] text-slate-400 mt-0.5">{batch.medicine.dosage}</p>
                );
              }
            }
            return null;
          })()}
        </div>
      ),
    },
    {
      header: 'Validade',
      width: '130px',
      cell: (batch) => {
        // data formatada em pt-br com travessao quando invalida.
        const exp = new Date(batch.expirationDate);
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {(() => {
                if (Number.isNaN(exp.getTime())) {
                  return '—';
                }
                return exp.toLocaleDateString('pt-BR');
              })()}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Saldo',
      width: '110px',
      cell: (batch) => (
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {batch.currentQuantity} un.
        </span>
      ),
    },
    {
      header: 'Fornecedor',
      width: '160px',
      cell: (batch) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {(() => {
            if (batch.supplier) {
              return batch.supplier;
            }
            return 'Não informado';
          })()}
        </span>
      ),
    },
    {
      header: 'Status do Lote',
      width: '140px',
      cell: (batch) => {
        const status = getBatchStatus(batch);
        return <StockStatusBadge status={status} />;
      },
    },
    {
      header: 'Ações',
      width: '160px',
      align: 'right',
      cell: (batch) => (
        // acoes por linha: sempre visualizar; bloquear/desbloquear,
        // ajustar e excluir so pra quem tem permissao de escrita.
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedBatch(batch)}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Visualizar histórico e detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {(() => {
            if (canWrite) {
              return (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openBlockDialog(batch)}
                    className={(() => {
                      if (batch.isBlocked) {
                        return 'h-8 w-8 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/40 bg-rose-50 dark:bg-rose-950/20';
                      }
                      return 'h-8 w-8 p-0 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30';
                    })()}
                    title={(() => {
                      if (batch.isBlocked) {
                        return 'Desbloquear lote sanitário';
                      }
                      return 'Bloquear lote sanitário';
                    })()}
                  >
                    {(() => {
                      if (batch.isBlocked) {
                        return <ShieldCheck className="w-4 h-4" />;
                      }
                      return <ShieldAlert className="w-4 h-4" />;
                    })()}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAdjustDialog(batch)}
                    className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    title="Ajuste auditado de estoque"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBatch(batch);
                      setDeleteOpen(true);
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Excluir lote"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              );
            }
            return null;
          })()}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto page-enter">
      {/* cabecalho com acoes: exportar csv e novo lote, ambas
          limitadas a quem tem batches_create. */}
      <PageHeader
        title="Entrada e Gestão de Lotes"
        description="Cadastre novas remessas de medicamentos, acompanhe validades e audite o saldo em estoque."
        icon={Boxes}
        actions={
          <div className="flex items-center gap-2">
            {canWrite && <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredBatches.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>}
            {(() => {
              if (canWrite) {
                return (
                  <Button
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Lote</span>
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        }
      />

      {/* barra de filtros: busca + chips de status do lote */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por lote ou medicamento..."
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
          {/* botao de limpar busca */}
          {(() => {
            if (batchSearch) {
              return (
                <button
                  onClick={() => setBatchSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              );
            }
            return null;
          })()}
        </div>

        {/* chips de status do lote (todos, em dia, baixo, critico, vencidos) */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'all', label: 'Todos os Lotes' },
            { id: 'ok', label: 'Em Dia' },
            { id: 'low', label: 'Baixo' },
            { id: 'critical', label: 'Crítico' },
            { id: 'expired', label: 'Vencidos' },
          ].map((tab) => {
            let btnClass = 'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ';
            if (batchStatusFilter === tab.id) {
              btnClass = btnClass + 'bg-emerald-600 text-white shadow-sm';
            } else {
              btnClass = btnClass + 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
            }
            return (
              <button
                key={tab.id}
                onClick={() => setBatchStatusFilter(tab.id)}
                className={btnClass}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* tabela de lotes, com empty state e clique na linha */}
      <DataTable
        columns={columns}
        data={filteredBatches}
        isLoading={loading}
        emptyIcon={Boxes}
        emptyTitle="Nenhum lote encontrado"
        emptyDescription="Tente ajustar a busca ou cadastre uma nova remessa de lote."
        emptyAction={(() => {
          if (canWrite) {
            return (
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Lote
              </Button>
            );
          }
          return undefined;
        })()}
        onRowClick={(b) => setSelectedBatch(b)}
      />

      {/* modal de entrada de novo lote */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Boxes className="w-5 h-5 text-emerald-600" />
              Entrada de Novo Lote
            </DialogTitle>
            <DialogDescription>
              Cadastre uma nova remessa de medicamentos recebida no estoque.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
            {/* select de medicamento. lista todos os medicamentos ativos. */}
            <div>
              <Label htmlFor="stock-medicineId" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Medicamento *
              </Label>
              <Select
                value={(() => {
                  if (form.medicineId) {
                    return String(form.medicineId);
                  }
                  return '';
                })()}
                onValueChange={(v) => setForm({ ...form, medicineId: Number(v) })}
              >
                <SelectTrigger id="stock-medicineId" aria-invalid={!!fieldErrors.medicineId} aria-describedby={fieldErrors.medicineId ? 'stock-medicineId-error' : undefined} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50">
                  <SelectValue placeholder="Selecione um medicamento..." />
                </SelectTrigger>
                <SelectContent>
                  {medicines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} {(() => {
                        if (m.dosage) {
                          return `(${m.dosage})`;
                        }
                        return '';
                      })()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.medicineId && <FieldError id="stock-medicineId-error" message={fieldErrors.medicineId} />}
            </div>

            {/* numero do lote + quantidade recebida */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-batchNumber" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Número do Lote *
                </Label>
                <Input
                  id="stock-batchNumber"
                  value={form.batchNumber}
                  aria-invalid={!!fieldErrors.batchNumber}
                  aria-describedby={fieldErrors.batchNumber ? 'stock-batchNumber-error' : undefined}
                  onChange={(e) => {
                    setForm({ ...form, batchNumber: e.target.value });
                    setFieldErrors((current) => ({ ...current, batchNumber: '' }));
                  }}
                  placeholder="Ex: LOT-2026-08A"
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
                {fieldErrors.batchNumber && <FieldError id="stock-batchNumber-error" message={fieldErrors.batchNumber} />}
              </div>

              <div>
                <Label htmlFor="stock-currentQuantity" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Quantidade Recebida *
                </Label>
                <Input
                  id="stock-currentQuantity"
                  type="number"
                  min={1}
                  aria-invalid={!!fieldErrors.currentQuantity}
                  aria-describedby={fieldErrors.currentQuantity ? 'stock-currentQuantity-error' : undefined}
                  value={(() => {
                    if (form.currentQuantity) {
                      return form.currentQuantity;
                    }
                    return '';
                  })()}
                  onChange={(e) => {
                    setForm({ ...form, currentQuantity: Number(e.target.value) });
                    setFieldErrors((current) => ({ ...current, currentQuantity: '' }));
                  }}
                  placeholder="Ex: 100"
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
                {fieldErrors.currentQuantity && <FieldError id="stock-currentQuantity-error" message={fieldErrors.currentQuantity} />}
              </div>
            </div>

            {/* validade + fabricacao */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-expirationDate" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Data de Validade *
                </Label>
                <Input
                  id="stock-expirationDate"
                  type="date"
                  aria-invalid={!!fieldErrors.expirationDate}
                  aria-describedby={fieldErrors.expirationDate ? 'stock-expirationDate-error' : undefined}
                  value={form.expirationDate}
                  onChange={(e) => {
                    setForm({ ...form, expirationDate: e.target.value });
                    setFieldErrors((current) => ({ ...current, expirationDate: '' }));
                  }}
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
                {fieldErrors.expirationDate && <FieldError id="stock-expirationDate-error" message={fieldErrors.expirationDate} />}
              </div>

              <div>
                <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Data de Fabricação
                </Label>
                <Input
                  type="date"
                  value={(() => {
                    if (form.manufacturingDate) {
                      return form.manufacturingDate;
                    }
                    return '';
                  })()}
                  onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
            </div>

            {/* fornecedor / origem */}
            <div>
              <Label htmlFor="stock-supplier" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Fornecedor / Origem *
              </Label>
              <Input
                id="stock-supplier"
                aria-invalid={!!fieldErrors.supplier}
                aria-describedby={fieldErrors.supplier ? 'stock-supplier-error' : undefined}
                placeholder="Ex: Laboratório EMS / Distribuidora Santa Cruz"
                value={form.supplier}
                onChange={(e) => {
                  setForm({ ...form, supplier: e.target.value });
                  setFieldErrors((current) => ({ ...current, supplier: '' }));
                }}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
              {fieldErrors.supplier && <FieldError id="stock-supplier-error" message={fieldErrors.supplier} />}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit">
                Registrar Lote
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* modal de detalhes do lote com historico. so abre quando
          selectedbatch esta setado e nenhum dos outros modais do lote
          esta aberto (evita empilhar). */}
      <Dialog
        open={(() => {
          if (selectedBatch) {
            if (!editOpen) {
              if (!deleteOpen) {
                return true;
              }
            }
          }
          return false;
        })()}
        onOpenChange={() => setSelectedBatch(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                  <Boxes className="w-5 h-5" />
                </div>
                Lote {(() => {
                  if (selectedBatch) {
                    return selectedBatch.batchNumber;
                  }
                  return '';
                })()}
              </DialogTitle>
              {/* botoes de editar e excluir, so pra quem tem permissao */}
              {(() => {
                if (canWrite) {
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedBatch) {
                            openEditDialog(selectedBatch);
                          }
                        }}
                        className="rounded-xl gap-1.5 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                        className="rounded-xl gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <DialogDescription>Informações do lote e histórico de movimentações</DialogDescription>
          </DialogHeader>

          {(() => {
            if (selectedBatch) {
              return (
                <div className="space-y-4">
                  {/* grade de cards com os dados do lote */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicamento</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {(() => {
                          let medText = '';
                          if (selectedBatch.medicine) {
                            if (selectedBatch.medicine.name) {
                              medText = medText + selectedBatch.medicine.name;
                            }
                            if (selectedBatch.medicine.dosage) {
                              medText = medText + ' ' + selectedBatch.medicine.dosage;
                            }
                          }
                          return medText;
                        })()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade Atual</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                        {selectedBatch.currentQuantity} unidades
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Validade</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {new Date(selectedBatch.expirationDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status do Estoque</p>
                      <div className="mt-1">
                        <StockStatusBadge status={getBatchStatus(selectedBatch)} />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fornecedor / Origem</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {(() => {
                          if (selectedBatch.supplier) {
                            return selectedBatch.supplier;
                          }
                          return 'Não informado';
                        })()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Fabricação</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {(() => {
                          if (selectedBatch.manufacturingDate) {
                            return new Date(selectedBatch.manufacturingDate).toLocaleDateString('pt-BR');
                          }
                          return 'Não informada';
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* banner de bloqueio sanitario, quando aplicavel */}
                  {(() => {
                    if (selectedBatch.isBlocked) {
                      return (
                        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                              Bloqueio Sanitário Ativo
                            </p>
                            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                              Motivo: {(() => {
                                if (selectedBatch.blockReason) {
                                  return selectedBatch.blockReason;
                                }
                                return 'Não especificado';
                              })()}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* historico de movimentacoes do lote */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Histórico de Movimentações ({batchHistory.length})
                    </h4>
                    {(() => {
                      if (batchHistory.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 italic py-2">Nenhuma movimentação registrada para este lote.</p>
                        );
                      }
                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {batchHistory.map((item, idx) => {
                            // cor do badge muda conforme o tipo do movimento.
                            let badgeClass = 'text-amber-600 border-amber-200';
                            let badgeLabel = 'Descarte';
                            if (item.type === 'dispense') {
                              badgeClass = 'text-teal-600 border-teal-200';
                              badgeLabel = 'Dispensação';
                            }
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-slate-200">{item.description}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Operador: {item.userName} • {new Date(item.date).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={badgeClass}
                                >
                                  {badgeLabel}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </DialogContent>
      </Dialog>

      {/* modal de edicao do lote. numero, quantidade e validade. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Lote</DialogTitle>
            <DialogDescription>Atualize os dados do lote cadastrado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-1">
            <div>
                        <Label htmlFor="stock-blockReason" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Número do Lote
              </Label>
              <Input
                value={editForm.batchNumber}
                onChange={(e) => setEditForm({ ...editForm, batchNumber: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label htmlFor="stock-adjustQuantity" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Quantidade em Estoque
              </Label>
              <Input
                type="number"
                min={0}
                value={editForm.currentQuantity}
                onChange={(e) => setEditForm({ ...editForm, currentQuantity: Number(e.target.value) })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label htmlFor="stock-adjustReason" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Data de Validade
              </Label>
              <Input
                type="date"
                value={editForm.expirationDate}
                onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading}>
                {(() => {
                  if (editLoading) {
                    return 'Salvando...';
                  }
                  return 'Salvar Alterações';
                })()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* modal de bloqueio/desbloqueio sanitario. o titulo, descricao
          e botao mudam conforme o estado atual do lote. motivo so
          obrigatorio quando esta bloqueando. */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              {(() => {
                if (batchToBlock) {
                  if (batchToBlock.isBlocked) {
                    return (
                      <>
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Desbloquear Lote Sanitário
                      </>
                    );
                  }
                }
                return (
                  <>
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    Bloquear Lote Sanitário
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (batchToBlock) {
                  if (batchToBlock.isBlocked) {
                    return `Confirma a liberação do lote ${batchToBlock.batchNumber} para novas dispensações e retiradas?`;
                  }
                  return `Ao bloquear o lote ${batchToBlock.batchNumber}, ele será imediatamente ignorado no FEFO e impedido de ser dispensado.`;
                }
                return 'Gerencie o bloqueio sanitário deste lote.';
              })()}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBlockConfirm} className="space-y-4 pt-1">
            {/* motivo so aparece no caso de bloqueio (nao no desbloqueio) */}
            {(() => {
              if (batchToBlock) {
                if (!batchToBlock.isBlocked) {
                  return (
                    <div>
                      <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                        Motivo do Bloqueio Sanitário *
                      </Label>
                      <Input
                        id="stock-blockReason"
                        aria-invalid={!!fieldErrors.blockReason}
                        aria-describedby={fieldErrors.blockReason ? 'stock-blockReason-error' : undefined}
                        placeholder="Ex: Recall Anvisa comunicado #123, suspeita de contaminação..."
                        value={blockReason}
                        onChange={(e) => {
                          setBlockReason(e.target.value);
                          setFieldErrors((current) => ({ ...current, blockReason: '' }));
                        }}
                        className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                      />
                      {fieldErrors.blockReason && <FieldError id="stock-blockReason-error" message={fieldErrors.blockReason} />}
                    </div>
                  );
                }
              }
              return null;
            })()}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setBlockOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={blockLoading}
                className={(() => {
                  if (batchToBlock) {
                    if (batchToBlock.isBlocked) {
                      return 'rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold';
                    }
                  }
                  return 'rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold';
                })()}
              >
                {(() => {
                  if (blockLoading) {
                    return 'Salvando...';
                  }
                  if (batchToBlock) {
                    if (batchToBlock.isBlocked) {
                      return 'Liberar / Desbloquear';
                    }
                  }
                  return 'Confirmar Bloqueio';
                })()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* modal de ajuste auditado de estoque. exige justificativa
          porque a api registra a movimentacao e o log. */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              Ajuste Auditado de Estoque
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (batchToAdjust) {
                  return `Ajuste manual com registro de auditoria para o lote ${batchToAdjust.batchNumber} (Saldo atual: ${batchToAdjust.currentQuantity} un.).`;
                }
                return 'Ajuste manual de quantidade em estoque com registro de auditoria.';
              })()}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustConfirm} className="space-y-4 pt-1">
            <div>
              <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Nova Quantidade em Estoque *
              </Label>
              <Input
                id="stock-adjustQuantity"
                type="number"
                min={0}
                aria-invalid={!!fieldErrors.adjustQuantity}
                aria-describedby={fieldErrors.adjustQuantity ? 'stock-adjustQuantity-error' : undefined}
                value={adjustNewQuantity}
                onChange={(e) => {
                  setAdjustNewQuantity(Number(e.target.value));
                  setFieldErrors((current) => ({ ...current, adjustQuantity: '' }));
                }}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
              {fieldErrors.adjustQuantity && <FieldError id="stock-adjustQuantity-error" message={fieldErrors.adjustQuantity} />}
            </div>

            <div>
              <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                Justificativa Obrigatória *
              </Label>
              <Input
                id="stock-adjustReason"
                aria-invalid={!!fieldErrors.adjustReason}
                aria-describedby={fieldErrors.adjustReason ? 'stock-adjustReason-error' : undefined}
                placeholder="Ex: Contagem física mensal, avaria de frasco, reconciliação..."
                value={adjustReason}
                onChange={(e) => {
                  setAdjustReason(e.target.value);
                  setFieldErrors((current) => ({ ...current, adjustReason: '' }));
                }}
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
              />
              {fieldErrors.adjustReason && <FieldError id="stock-adjustReason-error" message={fieldErrors.adjustReason} />}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={adjustLoading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {(() => {
                  if (adjustLoading) {
                    return 'Salvando...';
                  }
                  return 'Confirmar Ajuste';
                })()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* confirmacao de exclusao. o texto avisa que o backend bloqueia
          se houver movimentacoes vinculadas. */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Lote"
        description={(() => {
          let bNum = '';
          if (selectedBatch) {
            bNum = selectedBatch.batchNumber;
          }
          return `Tem certeza que deseja excluir o lote "${bNum}"? Se o lote possuir retiradas ou descartes vinculados, a exclusão será bloqueada.`;
        })()}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}