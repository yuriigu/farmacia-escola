'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast-handler';
import {
  Package, Search, Plus, Calendar,
  Pill, X, Eye, HeartPulse, ShieldCheck,
  Layers, Download
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useMedicines, useCreateMedicine, useBatches } from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { MEDICINE_CATEGORIES, downloadCSV } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/types';
import { CategoryBadge } from '@/components/shared/category-badge';
import { StockStatusBadge } from '@/components/shared/stock-status-badge';
import { AppointmentCreateModal } from '@/components/shared/appointment-create-modal';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { computeStockStatus } from '@/lib/stock';
import type { Medicine, Batch } from '@/types';

// unidades de dosagem aceitas no formulario. o schema zod logo abaixo
// usa essa mesma lista pra garantir consistencia entre ui e validacao.
export const DOSAGE_UNITS = ['MG', 'ML', 'G', 'MCG', 'UI'] as const;
export type DosageUnit = typeof DOSAGE_UNITS[number];

// schema do formulario de novo medicamento. alem dos campos basicos,
// trata a dosagem numerica: aceita numero ou string numerica e
// transforma em number. a unidade padrao e mg.
const newMedicineSchema = z.object({
  name: z.string().min(2, 'Nome do medicamento é obrigatório'),
  activeIngredient: z.string().optional(),
  dosageValue: z.union([
    z.number().positive('O valor da dosagem deve ser maior que zero'),
    z.string().regex(/^\d+(\.\d+)?$/, 'Informe um número válido para a dosagem').transform(Number),
  ]).optional(),
  dosageUnit: z.enum(['MG', 'ML', 'G', 'MCG', 'UI']).default('MG'),
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
});

type NewMedicineFormInput = z.input<typeof newMedicineSchema>;
type NewMedicineFormData = z.output<typeof newMedicineSchema>;

// tela do catalogo de medicamentos. lista o catalogo com saldo fisico,
// reservado e disponivel real, permite criar medicamento (admin e
// farmaceutico) e agendar retirada (com trava anti-overbooking).
// a mesma tela serve pra paciente e equipe, mudando textos e permissoes.
export default function MedicinesPage() {
  const user = useAuthStore((s) => {
    return s.user;
  });

  // determina se o usuario e paciente (muda textos e trava de paciente).
  let isPatient = false;
  if (user) {
    if (user.role === 'PACIENTE') {
      isPatient = true;
    } else {
      isPatient = false;
    }
  } else {
    isPatient = false;
  }

  // quem pode cadastrar medicamento: admin e farmaceutico.
  let canCreateMedicine = false;
  if (user) {
    if (user.role === 'ADMIN') {
      canCreateMedicine = true;
    } else if (user.role === 'FARMACEUTICO') {
      canCreateMedicine = true;
    } else {
      canCreateMedicine = false;
    }
  } else {
    canCreateMedicine = false;
  }

  // papel normalizado pra comparacao. usado pra decidir se mostra
  // o botao de exportar csv.
  let normalizedRole = '';
  if (user) {
    if (user.role) {
      normalizedRole = user.role.toUpperCase();
    }
  }

  // exportar csv so pra admin e farmaceutico.
  let canExport = false;
  if (normalizedRole === 'ADMIN') {
    canExport = true;
  } else {
    if (normalizedRole === 'FARMACEUTICO') {
      canExport = true;
    } else {
      canExport = false;
    }
  }

  // dados do catalogo de medicamentos.
  const { data: rawMedicines, isLoading } = useMedicines();
  let medicines: Medicine[] = [];
  if (rawMedicines) {
    medicines = rawMedicines;
  } else {
    medicines = [];
  }

  // mutation de cadastro de medicamento.
  const createMedicineMutation = useCreateMedicine();

  // estados de filtro da listagem.
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // estados dos modais de cadastro, detalhes e agendamento.
  const [isCreateMedicineOpen, setIsCreateMedicineOpen] = useState(false);
  const [selectedMedicineForDetails, setSelectedMedicineForDetails] = useState<Medicine | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentMedicineId, setAppointmentMedicineId] = useState<number | undefined>();

  // quando o modal de detalhes esta aberto, buscamos os lotes daquele
  // medicamento via /services/queries pra mostrar a lista atualizada.
  let selectedMedDetailsId: number | undefined = undefined;
  if (selectedMedicineForDetails) {
    selectedMedDetailsId = selectedMedicineForDetails.id;
  } else {
    selectedMedDetailsId = undefined;
  }
  const { data: queriedBatches } = useBatches(selectedMedDetailsId, { enabled: !isPatient });

  // hook de formulario do medicamento (react-hook-form + zod).
  const {
    register,
    handleSubmit,
    reset: resetMedicineForm,
    formState: { errors },
  } = useForm<NewMedicineFormInput, unknown, NewMedicineFormData>({
    resolver: zodResolver(newMedicineSchema),
    defaultValues: {
      name: '',
      activeIngredient: '',
      dosageValue: undefined,
      dosageUnit: 'MG',
      accessibleDesc: '',
      category: 'analgesico',
    },
  });

  // submit do cadastro de medicamento. monta a dosagem no formato
  // "valor unidade", normaliza os textos opcionais (trim ou undefined)
  // e chama a mutation.
  const onSubmitMedicine = (data: NewMedicineFormData) => {
    let formattedDosage: string | undefined = undefined;
    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        formattedDosage = String(data.dosageValue) + ' ' + data.dosageUnit;
      }
    }

    // textos em branco viram undefined pra nao sujar o payload.
    let activeIngredientVal: string | undefined = undefined;
    if (data.activeIngredient) {
      if (data.activeIngredient.trim().length > 0) {
        activeIngredientVal = data.activeIngredient.trim();
      }
    }

    let accessibleDescVal: string | undefined = undefined;
    if (data.accessibleDesc) {
      if (data.accessibleDesc.trim().length > 0) {
        accessibleDescVal = data.accessibleDesc.trim();
      }
    }

    // chama a mutation de criar medicamento (/services/queries ->
    // /api/medicines no backend).
    createMedicineMutation.mutate(
      {
        name: data.name.trim(),
        activeIngredient: activeIngredientVal,
        dosage: formattedDosage,
        dosageValue: data.dosageValue,
        dosageUnit: data.dosageUnit,
        accessibleDesc: accessibleDescVal,
        category: data.category,
      },
      {
        onSuccess: () => {
          setIsCreateMedicineOpen(false);
          resetMedicineForm();
          toast.success('Medicamento cadastrado com sucesso!');
        },
        onError: (err: any) => {
          let msg = 'Erro ao cadastrar medicamento.';
          if (err) {
            if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao cadastrar medicamento.';
            }
          } else {
            msg = 'Erro ao cadastrar medicamento.';
          }
          toast.error(msg);
        },
      }
    );
  };

  const handleOpenAppointmentModal = (med: Medicine) => {
    setAppointmentMedicineId(med.id);
    setIsAppointmentModalOpen(true);
  };

  // filtro da listagem. combina busca por texto, categoria e status
  // de estoque. o status pode vir da api ou ser calculado no cliente
  // via computestockstatus (fallback quando a api nao manda).
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      // busca por nome, principio ativo ou dosagem, em cascata.
      const term = searchTerm.toLowerCase();
      const matchesSearch = med.name.toLowerCase().includes(term)
        || Boolean(med.activeIngredient?.toLowerCase().includes(term))
        || Boolean(med.dosage?.toLowerCase().includes(term));

      const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
      const physicalQuantity = med.physicalQuantity ?? med.totalQuantity ?? 0;
      const status = med.status || computeStockStatus({
        totalQuantity: physicalQuantity,
        physicalQuantity,
      });
      const isExpired = status === 'EXPIRED' || status === 'expired' || status === 'Vencido';
      if (isPatient && isExpired) return false;

      let matchesStock = stockFilter === 'all';
      if (isPatient && stockFilter === 'DISPONIVEL') {
        matchesStock = med.available === true;
      } else if (isPatient && stockFilter === 'INDISPONIVEL') {
        matchesStock = med.available === false;
      } else if (stockFilter === 'IN_STOCK' || stockFilter === 'ok') {
        matchesStock = status === 'IN_STOCK' || status === 'ok';
      } else if (stockFilter === 'CRITICAL_EXPIRATION' || stockFilter === 'low') {
        matchesStock = status === 'CRITICAL_EXPIRATION' || status === 'low';
      } else if (stockFilter === 'OUT_OF_STOCK' || stockFilter === 'critical') {
        matchesStock = status === 'OUT_OF_STOCK' || status === 'critical';
      } else if (stockFilter === 'EXPIRED' || stockFilter === 'expired') {
        matchesStock = status === 'EXPIRED' || status === 'expired';
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medicines, searchTerm, selectedCategory, stockFilter, isPatient]);

  const handleExportCSV = () => {
    const header = ['Nome', 'Princípio Ativo', 'Dosagem', 'Categoria', 'Saldo Físico', 'Saldo Reservado', 'Disponível Real', 'Status'];
    const rows = filteredMedicines.map((medicine) => {
      const physical = medicine.physicalQuantity ?? medicine.totalQuantity ?? 0;
      const reserved = medicine.reservedQuantity ?? 0;
      const available = medicine.availableQuantity ?? Math.max(0, physical - reserved);
      const status = medicine.status || computeStockStatus({ totalQuantity: physical });
      return [
        medicine.name,
        medicine.activeIngredient ?? '—',
        medicine.dosage ?? '—',
        medicine.category ?? 'Geral',
        `${physical} un.`,
        `${reserved} un.`,
        `${available} un.`,
        String(status),
      ];
    });
    downloadCSV('catalogo_medicamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Catálogo exportado com sucesso!');
  };

  const columns = useMemo<Column<Medicine>[]>(() => [
    {
      header: 'Medicamento',
      width: '240px',
      cell: (med) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">{med.name}</p>
            {med.dosage && <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">{med.dosage}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Categoria',
      width: '130px',
      cell: (med) => <CategoryBadge category={med.category} />,
    },
    {
      header: 'Princípio Ativo',
      cell: (med) => <span className="text-xs text-slate-600 dark:text-slate-300">{med.activeIngredient ?? '—'}</span>,
    },
    ...(isPatient
      ? [{
          header: 'Disponibilidade',
          width: '150px',
          cell: (med: Medicine) => <StockStatusBadge status={med.status} variant="patient" available={med.available} />,
        }]
      : [
          {
            header: 'Saldo Físico',
            width: '110px',
            cell: (med: Medicine) => <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{med.physicalQuantity ?? med.totalQuantity ?? 0} un.</span>,
          },
          {
            header: 'Reservado',
            width: '100px',
            cell: (med: Medicine) => {
              const reserved = med.reservedQuantity ?? 0;
              return reserved > 0
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{reserved} un.</span>
                : <span className="text-xs text-slate-400 dark:text-slate-500">0 un.</span>;
            },
          },
    {
      header: 'Disponível Real',
      width: '120px',
      cell: (med) => {
        // disponivel real = fisico - reservado (ou availablequantity).
        // destaque verde quando positivo, vermelho quando zero.
        let physical = 0;
        if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
          physical = med.physicalQuantity;
        } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
          physical = med.totalQuantity;
        } else {
          physical = 0;
        }

        let reserved = 0;
        if (med.reservedQuantity !== null && med.reservedQuantity !== undefined) {
          reserved = med.reservedQuantity;
        } else {
          reserved = 0;
        }

        let available = 0;
        if (med.availableQuantity !== null && med.availableQuantity !== undefined) {
          available = med.availableQuantity;
        } else {
          if (physical > reserved) {
            available = physical - reserved;
          } else {
            available = 0;
          }
        }

        if (available > 0) {
          return (
            <span className="font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
              {available} un.
            </span>
          );
        }

        return (
          <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
            0 un.
          </span>
        );
      },
    },
    {
      header: 'Status Detalhado',
      width: '140px',
      cell: (med) => {
        // status vem da api ou calculado no cliente como fallback.
        let physical = 0;
        if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
          physical = med.physicalQuantity;
        } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
          physical = med.totalQuantity;
        } else {
          physical = 0;
        }

        let currentStatus = med.status;
        if (!currentStatus) {
          currentStatus = computeStockStatus({ totalQuantity: physical });
        }
        return <StockStatusBadge status={currentStatus} />;
      },
    },
    ]),
    {
      header: 'Ações',
      width: '180px',
      align: 'right',
      cell: (med) => {
        // resolve o estado do medicamento pra decidir se o botao de
        // agendar fica habilitado. fica desabilitado se sem saldo,
        // vencido ou bloqueado.
        let physical = 0;
        if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
          physical = med.physicalQuantity;
        } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
          physical = med.totalQuantity;
        } else {
          physical = 0;
        }

        let reserved = 0;
        if (med.reservedQuantity !== null && med.reservedQuantity !== undefined) {
          reserved = med.reservedQuantity;
        } else {
          reserved = 0;
        }

        let realAvail = 0;
        if (med.availableQuantity !== null && med.availableQuantity !== undefined) {
          realAvail = med.availableQuantity;
        } else {
          if (physical > reserved) {
            realAvail = physical - reserved;
          } else {
            realAvail = 0;
          }
        }

        let currentStatus = med.status;
        if (!currentStatus) {
          currentStatus = computeStockStatus({ totalQuantity: physical });
        }

        const isExpired =
          currentStatus === 'EXPIRED' ||
          currentStatus === 'expired' ||
          currentStatus === 'Vencido';

        const isBlocked =
          currentStatus === 'BLOCKED' ||
          currentStatus === 'Bloqueado';

        const isUnavailable = isPatient
          ? med.available !== true
          : realAvail <= 0 || isExpired || isBlocked;

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedMedicineForDetails(med)}
              className="h-8 w-8 p-0 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
              title="Ver detalhes"
              aria-label="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              disabled={isUnavailable}
              onClick={() => {
                if (!isUnavailable) {
                  handleOpenAppointmentModal(med);
                }
              }}
              title={isUnavailable ? 'Medicamento indisponível para agendamento' : 'Agendar retirada'}
              className={
                isUnavailable
                  ? 'h-8 px-2.5 rounded-lg text-xs gap-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 font-medium shadow-none cursor-not-allowed disabled:pointer-events-auto disabled:opacity-60'
                  : 'h-8 px-2.5 rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs'
              }
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar</span>
            </Button>
          </div>
        );
      },
    },
  ], [isPatient]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* cabecalho com acoes (exportar csv e novo medicamento) */}
        <PageHeader
          title="Catálogo de Medicamentos"
          description={isPatient
            ? 'Consulte medicamentos e agende dispensações na Farmácia Escola Universitária.'
            : 'Consulte estoque físico, reservas em tempo real e agende dispensações na Farmácia Escola Universitária.'}
          icon={Pill}
          actions={
            <div className="flex items-center gap-2">
              {canExport && <Button
                variant="outline"
                onClick={handleExportCSV}
                className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>}
              {(() => {
                if (canCreateMedicine) {
                  return (
                    <Button
                      onClick={() => setIsCreateMedicineOpen(true)}
                      size="sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Medicamento</span>
                    </Button>
                  );
                }
                return null;
              })()}
            </div>
          }
        />

        {/* barra de filtros: busca + status + categoria */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* busca por texto */}
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome, princípio ativo ou dosagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              {/* botao de limpar busca, aparece so quando tem texto */}
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

            {/* filtro por status de estoque */}
            <div className="sm:col-span-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todos os status</option>
                {isPatient ? (
                  <>
                    <option value="DISPONIVEL">Disponível</option>
                    <option value="INDISPONIVEL">Indisponível</option>
                  </>
                ) : (
                  <>
                    <option value="IN_STOCK">Disponível (Em dia)</option>
                    <option value="CRITICAL_EXPIRATION">Vencimento Próximo (≤ 30d)</option>
                    <option value="OUT_OF_STOCK">Sem Estoque</option>
                    <option value="EXPIRED">Vencido</option>
                  </>
                )}
              </select>
            </div>

            {/* filtro por categoria */}
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

        {/* tabela do catalogo, com empty state e clique na linha */}
        {(() => {
          let emptyActionElement: React.ReactNode = undefined;
          if (canCreateMedicine) {
            emptyActionElement = (
              <Button
                onClick={() => {
                  setIsCreateMedicineOpen(true);
                }}
                className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Medicamento
              </Button>
            );
          } else {
            emptyActionElement = undefined;
          }

          return (
            <DataTable
              columns={columns}
              data={filteredMedicines}
              isLoading={isLoading}
              emptyIcon={Package}
              emptyTitle="Nenhum medicamento encontrado"
              emptyDescription="Tente ajustar os termos de busca ou os filtros selecionados."
              emptyAction={emptyActionElement}
              onRowClick={(med) => {
                setSelectedMedicineForDetails(med);
              }}
            />
          );
        })()}

        {/* modal de detalhes do medicamento (lg). mostra painel de
            saldo, orientacoes ao paciente, lista de lotes e botao
            de agendar quando disponivel. */}
        <Dialog
          open={selectedMedicineForDetails !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMedicineForDetails(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
            {selectedMedicineForDetails && (() => {
              const med = selectedMedicineForDetails;

              // resolve o painel de saldos (fisico, reservado, real).
              let physicalQty = 0;
              if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
                physicalQty = med.physicalQuantity;
              } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
                physicalQty = med.totalQuantity;
              } else {
                physicalQty = 0;
              }

              let reservedQty = 0;
              if (med.reservedQuantity !== null && med.reservedQuantity !== undefined) {
                reservedQty = med.reservedQuantity;
              } else {
                reservedQty = 0;
              }

              let realAvailQty = 0;
              if (med.availableQuantity !== null && med.availableQuantity !== undefined) {
                realAvailQty = med.availableQuantity;
              } else {
                if (physicalQty > reservedQty) {
                  realAvailQty = physicalQty - reservedQty;
                } else {
                  realAvailQty = 0;
                }
              }

              // flag pra decidir se mostra o botao de agendar.
              let isAvail = false;
              if (realAvailQty > 0) {
                isAvail = true;
              } else {
                isAvail = false;
              }

              let status = med.status;
              if (!status) {
                status = computeStockStatus({ totalQuantity: physicalQty });
              }

              let activeIngredientText = 'Não informado';
              if (med.activeIngredient) {
                activeIngredientText = med.activeIngredient;
              } else {
                activeIngredientText = 'Não informado';
              }

              // bloco de orientacoes ao paciente. cai pra um texto
              // de "nenhuma instrucao" quando vazio.
              let accessibleDescElement: React.ReactNode = null;
              if (med.accessibleDesc) {
                accessibleDescElement = (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {med.accessibleDesc}
                  </div>
                );
              } else {
                accessibleDescElement = (
                  <p className="text-xs text-slate-400 italic">
                    Nenhuma orientação específica registrada para este medicamento.
                  </p>
                );
              }

              // botao de agendar so aparece quando tem saldo real.
              let scheduleButton: React.ReactNode = null;
              if (isAvail) {
                scheduleButton = (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentMed = med;
                      setSelectedMedicineForDetails(null);
                      handleOpenAppointmentModal(currentMed);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar Retirada
                  </Button>
                );
              }

              return (
                <div className="space-y-5">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge category={med.category} />
                      <StockStatusBadge
                        status={status}
                        variant={isPatient ? 'patient' : 'default'}
                        available={isPatient ? med.available : undefined}
                      />
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      <Pill className="w-6 h-6 text-emerald-600" />
                      {med.name}
                    </DialogTitle>
                    {(() => {
                      if (med.dosage) {
                        return (
                          <DialogDescription className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                            Dosagem: {med.dosage}
                          </DialogDescription>
                        );
                      }
                      return null;
                    })()}
                  </DialogHeader>

                  {/* painel de saldos: fisico, reservado, disponivel real */}
                  {!isPatient && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Saldo Físico</span>
                      <span className="text-slate-800 dark:text-slate-100 font-black text-base">
                        {physicalQty} un.
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-amber-500 block font-semibold text-[10px] uppercase tracking-wider">Reservado</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black text-base">
                        {reservedQty} un.
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                      <span className="text-emerald-600 dark:text-emerald-400 block font-semibold text-[10px] uppercase tracking-wider">Disponível Real</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-black text-base">
                        {realAvailQty} un.
                      </span>
                    </div>
                  </div>
                  )}

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <span className="text-slate-400 block font-medium">Princípio Ativo</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                      {activeIngredientText}
                    </span>
                  </div>

                  {/* orientacoes e instrucoes ao paciente */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-emerald-600" />
                      Orientações e Instruções
                    </h4>
                    {accessibleDescElement}

                    <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>
                        Apresente a receita médica válida e documento com foto no momento da retirada na Farmácia Escola Universitária.
                      </span>
                    </div>
                  </div>

                  {/* lista de lotes do medicamento. usa queriedbatches
                      quando disponivel, senao cai pra med.batches. */}
                  {!isPatient && (() => {
                    let displayBatches: Batch[] = [];
                    if (queriedBatches) {
                      if (queriedBatches.length > 0) {
                        displayBatches = queriedBatches;
                      } else {
                        if (med.batches) {
                          if (Array.isArray(med.batches)) {
                            displayBatches = med.batches;
                          }
                        }
                      }
                    } else {
                      if (med.batches) {
                        if (Array.isArray(med.batches)) {
                          displayBatches = med.batches;
                        }
                      }
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-teal-600" />
                            Lotes Registrados ({displayBatches.length})
                          </h4>
                        </div>
                        {(() => {
                          if (displayBatches.length === 0) {
                            return (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                <span>Nenhum lote cadastrado para este medicamento.</span>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {displayBatches.map((batch) => {
                                // formata validade e detecta se esta vencido.
                                let expStr = '—';
                                if (batch.expirationDate) {
                                  expStr = new Date(batch.expirationDate).toLocaleDateString('pt-BR');
                                }

                                let isExpired = false;
                                if (batch.expirationDate) {
                                  const expDate = new Date(batch.expirationDate);
                                  const now = new Date();
                                  if (expDate.getTime() < now.getTime()) {
                                    isExpired = true;
                                  }
                                }

                                return (
                                  <div
                                    key={batch.id}
                                    className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                                          {batch.batchNumber}
                                        </span>
                                        {/* badge de bloqueio tem prioridade
                                            sobre o de vencido. */}
                                        {(() => {
                                          if (batch.isBlocked) {
                                            return (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                Bloqueado
                                              </span>
                                            );
                                          }
                                          if (isExpired) {
                                            return (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                Vencido
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Validade: <span className="font-medium text-slate-700 dark:text-slate-300">{expStr}</span>
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                                        {batch.currentQuantity} un.
                                      </span>
                                      <p className="text-[10px] text-slate-400">
                                        Quantidade
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* footer do modal de detalhes com botao de agendar (se disponivel) */}
                  <DialogFooter className="pt-2 gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedMedicineForDetails(null);
                      }}
                      className="rounded-xl text-xs"
                    >
                      Fechar
                    </Button>
                    {scheduleButton}
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <AppointmentCreateModal
          key={isAppointmentModalOpen ? `open-${appointmentMedicineId}` : 'closed'}
          open={isAppointmentModalOpen}
          initialMedicineId={appointmentMedicineId}
          onOpenChange={(open) => {
            setIsAppointmentModalOpen(open);
            if (!open) setAppointmentMedicineId(undefined);
          }}
          onSuccess={() => setSelectedMedicineForDetails(null)}
        />

        {/* modal de cadastro de medicamento (md), com dosagem
            estruturada (valor + unidade) validada pelo zod. */}
        <Dialog
          open={isCreateMedicineOpen}
          onOpenChange={(open) => {
            setIsCreateMedicineOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Package className="w-5 h-5 text-emerald-600" />
                Novo Medicamento
              </DialogTitle>
              <DialogDescription>
                Cadastre um novo item no catálogo da Farmácia Escola Universitária com dosagem padronizada.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmitMedicine)} className="space-y-4 py-2">
              {/* nome do medicamento */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Nome do Medicamento *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Paracetamol, Amoxicilina, Dipirona..."
                  {...register('name')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                />
                {(() => {
                  if (errors.name) {
                    if (errors.name.message) {
                      return <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>;
                    }
                  }
                  return null;
                })()}
              </div>

              {/* dosagem estruturada: input numerico + select de unidade */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="dosageValue" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Dosagem Numérica
                  </Label>
                  <Input
                    id="dosageValue"
                    type="number"
                    step="any"
                    min={0.0001}
                    placeholder="Ex: 500, 10, 2.5"
                    {...register('dosageValue')}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                  {(() => {
                    if (errors.dosageValue) {
                      if (errors.dosageValue.message) {
                        return <p className="text-xs text-rose-500 font-medium">{errors.dosageValue.message as string}</p>;
                      }
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dosageUnit" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Unidade *
                  </Label>
                  <select
                    id="dosageUnit"
                    {...register('dosageUnit')}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {DOSAGE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* principio ativo e categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="activeIngredient" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Princípio Ativo
                  </Label>
                  <Input
                    id="activeIngredient"
                    placeholder="Ex: Paracetamol monoidratado"
                    {...register('activeIngredient')}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Categoria
                  </Label>
                  <select
                    id="category"
                    {...register('category')}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {/* remove a opcao 'all' que existe no catalogo mas
                        nao faz sentido como categoria de um medicamento */}
                    {MEDICINE_CATEGORIES.filter((c) => {
                      if (c.id !== 'all') {
                        return true;
                      } else {
                        return false;
                      }
                    }).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* descricao acessivel ao paciente */}
              <div className="space-y-1.5">
                <Label htmlFor="accessibleDesc" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Descrição Acessível / Instruções
                </Label>
                <Input
                  id="accessibleDesc"
                  placeholder="Instruções para o paciente em linguagem simples..."
                  {...register('accessibleDesc')}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateMedicineOpen(false);
                  }}
                  className="rounded-xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMedicineMutation.isPending}
                  size="sm"
                >
                  {(() => {
                    if (createMedicineMutation.isPending) {
                      return 'Salvando...';
                    } else {
                      return 'Salvar Medicamento';
                    }
                  })()}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}