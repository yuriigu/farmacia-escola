'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Package, Search, Plus, Calendar,
  Pill, X, Eye, HeartPulse, ShieldCheck,
  Layers, Clock, User, Download, Boxes, AlertCircle, CheckCircle2
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMedicines, useCreateMedicine, useCreateAppointment, usePatients, useCreateBatch } from '@/services/Queries';
import { useAuthStore } from '@/lib/AuthStore';
import { MEDICINE_CATEGORIES, downloadCSV } from '@/lib/Constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { computeStockStatus, type Medicine, type StockStatus } from '@/lib/Types';

export const DOSAGE_UNITS = ['MG', 'ML', 'G', 'MCG', 'UI'] as const;
export type DosageUnit = typeof DOSAGE_UNITS[number];

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

export default function MedicinesPage() {
  const user = useAuthStore((s) => {
    return s.user;
  });

  // DETERMINANDO SE E PACIENTE
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

  // DETERMINANDO SE PODE CRIAR MEDICAMENTO
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

  const { data: rawMedicines, isLoading } = useMedicines();
  let medicines: Medicine[] = [];
  if (rawMedicines) {
    medicines = rawMedicines;
  } else {
    medicines = [];
  }

  const { data: rawPatients } = usePatients();
  let patients: any[] = [];
  if (rawPatients) {
    patients = rawPatients;
  } else {
    patients = [];
  }

  const createMedicineMutation = useCreateMedicine();
  const createAppointmentMutation = useCreateAppointment();
  const createBatchMutation = useCreateBatch();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Modals state
  const [isCreateMedicineOpen, setIsCreateMedicineOpen] = useState(false);
  const [selectedMedicineForDetails, setSelectedMedicineForDetails] = useState<Medicine | null>(null);
  const [selectedMedicineForAppointment, setSelectedMedicineForAppointment] = useState<Medicine | null>(null);

  // Guided Initial Batch Modal state
  const [isInitialBatchModalOpen, setIsInitialBatchModalOpen] = useState(false);
  const [newlyCreatedMedicine, setNewlyCreatedMedicine] = useState<Medicine | null>(null);
  const [initialBatchNumber, setInitialBatchNumber] = useState('');
  const [initialBatchQuantity, setInitialBatchQuantity] = useState(100);
  const [initialBatchExpiration, setInitialBatchExpiration] = useState('');

  // Appointment Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentQuantity, setAppointmentQuantity] = useState(1);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const selectedUnit = watch('dosageUnit');

  const onSubmitMedicine = (data: NewMedicineFormData) => {
    let formattedDosage: string | undefined = undefined;
    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        formattedDosage = String(data.dosageValue) + ' ' + data.dosageUnit;
      }
    }

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

    createMedicineMutation.mutate(
      {
        name: data.name.trim(),
        activeIngredient: activeIngredientVal,
        dosage: formattedDosage,
        accessibleDesc: accessibleDescVal,
        category: data.category,
      },
      {
        onSuccess: (createdMed: any) => {
          setIsCreateMedicineOpen(false);
          resetMedicineForm();
          let createdObj: Medicine = createdMed;
          if (!createdObj) {
            createdObj = {
              id: Date.now(),
              name: data.name.trim(),
              activeIngredient: activeIngredientVal || '',
              dosage: formattedDosage || '',
              accessibleDesc: accessibleDescVal || '',
              category: data.category,
              totalQuantity: 0,
              physicalQuantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              batchesCount: 0,
              createdAt: new Date().toISOString(),
            };
          }
          setNewlyCreatedMedicine(createdObj);
          setInitialBatchNumber('LOT-' + new Date().getFullYear() + '-001');
          setInitialBatchQuantity(100);
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setInitialBatchExpiration(nextYear.toISOString().split('T')[0]);
          setIsInitialBatchModalOpen(true);
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

  const handleCreateInitialBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newlyCreatedMedicine) {
      toast.error('Nenhum medicamento selecionado.');
      return;
    }
    if (!initialBatchNumber.trim()) {
      toast.error('Informe o número do lote.');
      return;
    }
    if (!initialBatchExpiration) {
      toast.error('Informe a data de validade do lote.');
      return;
    }
    if (initialBatchQuantity <= 0) {
      toast.error('A quantidade do lote deve ser maior que zero.');
      return;
    }

    createBatchMutation.mutate(
      {
        medicineId: newlyCreatedMedicine.id,
        batchNumber: initialBatchNumber.trim(),
        currentQuantity: initialBatchQuantity,
        expirationDate: new Date(initialBatchExpiration).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Primeiro lote ' + initialBatchNumber.trim() + ' cadastrado com sucesso!');
          setIsInitialBatchModalOpen(false);
          setNewlyCreatedMedicine(null);
          setInitialBatchNumber('');
          setInitialBatchQuantity(100);
          setInitialBatchExpiration('');
        },
        onError: (err: any) => {
          let errorMsg = 'Erro ao cadastrar lote inicial.';
          if (err) {
            if (err.message) {
              errorMsg = err.message;
            }
          }
          toast.error(errorMsg);
        },
      }
    );
  };

  const handleOpenAppointmentModal = (med: Medicine) => {
    setSelectedMedicineForAppointment(med);
    setAppointmentQuantity(1);
    setAppointmentNotes('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setAppointmentTime('09:00');
    if (!isPatient) {
      if (patients.length > 0) {
        setSelectedPatientId(patients[0].id);
      }
    }
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicineForAppointment) {
      toast.error('Informe a data do agendamento.');
      return;
    }
    if (!appointmentDate) {
      toast.error('Informe a data do agendamento.');
      return;
    }

    if (!isPatient) {
      if (!selectedPatientId) {
        toast.error('Selecione o paciente para o agendamento.');
        return;
      }
    }

    // Regra de Reserva de Estoque no Agendamento (Anti-Overbooking)
    let physicalStock = 0;
    if (selectedMedicineForAppointment.physicalQuantity !== null && selectedMedicineForAppointment.physicalQuantity !== undefined) {
      physicalStock = selectedMedicineForAppointment.physicalQuantity;
    } else if (selectedMedicineForAppointment.totalQuantity !== null && selectedMedicineForAppointment.totalQuantity !== undefined) {
      physicalStock = selectedMedicineForAppointment.totalQuantity;
    } else {
      physicalStock = 0;
    }

    let reservedStock = 0;
    if (selectedMedicineForAppointment.reservedQuantity !== null && selectedMedicineForAppointment.reservedQuantity !== undefined) {
      reservedStock = selectedMedicineForAppointment.reservedQuantity;
    } else {
      reservedStock = 0;
    }

    let realAvailableStock = 0;
    if (selectedMedicineForAppointment.availableQuantity !== null && selectedMedicineForAppointment.availableQuantity !== undefined) {
      realAvailableStock = selectedMedicineForAppointment.availableQuantity;
    } else {
      if (physicalStock > reservedStock) {
        realAvailableStock = physicalStock - reservedStock;
      } else {
        realAvailableStock = 0;
      }
    }

    if (appointmentQuantity > realAvailableStock) {
      toast.error(
        'Estoque insuficiente: A quantidade solicitada (' +
          appointmentQuantity +
          ' un.) excede o saldo disponível real (' +
          realAvailableStock +
          ' un.). Há ' +
          reservedStock +
          ' un. reservadas para outros agendamentos.'
      );
      return;
    }

    let targetPatientId: number | undefined = undefined;
    if (!isPatient) {
      targetPatientId = selectedPatientId;
    } else {
      targetPatientId = undefined;
    }

    let notesVal: string | undefined = undefined;
    if (appointmentNotes.trim().length > 0) {
      notesVal = appointmentNotes.trim();
    } else {
      notesVal = undefined;
    }

    createAppointmentMutation.mutate(
      {
        scheduledDate: appointmentDate,
        scheduledTime: appointmentTime,
        patientId: targetPatientId,
        notes: notesVal,
        items: [
          {
            medicineId: selectedMedicineForAppointment.id,
            quantity: appointmentQuantity,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success('Agendamento realizado com sucesso! Estoque reservado.');
          setSelectedMedicineForAppointment(null);
          setSelectedMedicineForDetails(null);
        },
        onError: (err: any) => {
          let msg = 'Erro ao realizar agendamento.';
          if (err) {
            if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao realizar agendamento.';
            }
          } else {
            msg = 'Erro ao realizar agendamento.';
          }
          toast.error(msg);
        },
      }
    );
  };

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const term = searchTerm.toLowerCase();

      let matchesSearch = false;
      if (med.name.toLowerCase().includes(term)) {
        matchesSearch = true;
      } else if (med.activeIngredient) {
        if (med.activeIngredient.toLowerCase().includes(term)) {
          matchesSearch = true;
        } else if (med.dosage) {
          if (med.dosage.toLowerCase().includes(term)) {
            matchesSearch = true;
          } else {
            matchesSearch = false;
          }
        } else {
          matchesSearch = false;
        }
      } else if (med.dosage) {
        if (med.dosage.toLowerCase().includes(term)) {
          matchesSearch = true;
        } else {
          matchesSearch = false;
        }
      } else {
        matchesSearch = false;
      }

      let matchesCategory = false;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (med.category === selectedCategory) {
        matchesCategory = true;
      } else {
        matchesCategory = false;
      }

      let medPhysicalQty = 0;
      if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
        medPhysicalQty = med.physicalQuantity;
      } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
        medPhysicalQty = med.totalQuantity;
      } else {
        medPhysicalQty = 0;
      }

      let status = med.status;
      if (!status) {
        status = computeStockStatus({
          totalQuantity: medPhysicalQty,
          physicalQuantity: medPhysicalQty,
        });
      }

      let matchesStock = false;
      if (stockFilter === 'all') {
        matchesStock = true;
      } else if (stockFilter === 'IN_STOCK' || stockFilter === 'ok') {
        if (status === 'IN_STOCK' || status === 'ok') {
          matchesStock = true;
        } else {
          matchesStock = false;
        }
      } else if (stockFilter === 'CRITICAL_EXPIRATION' || stockFilter === 'low') {
        if (status === 'CRITICAL_EXPIRATION' || status === 'low') {
          matchesStock = true;
        } else {
          matchesStock = false;
        }
      } else if (stockFilter === 'OUT_OF_STOCK' || stockFilter === 'critical') {
        if (status === 'OUT_OF_STOCK' || status === 'critical') {
          matchesStock = true;
        } else {
          matchesStock = false;
        }
      } else if (stockFilter === 'EXPIRED' || stockFilter === 'expired') {
        if (status === 'EXPIRED' || status === 'expired') {
          matchesStock = true;
        } else {
          matchesStock = false;
        }
      } else {
        matchesStock = false;
      }

      if (matchesSearch) {
        if (matchesCategory) {
          if (matchesStock) {
            return true;
          }
        }
      }
      return false;
    });
  }, [medicines, searchTerm, selectedCategory, stockFilter]);

  const handleExportCSV = () => {
    const header = ['Nome', 'Princípio Ativo', 'Dosagem', 'Categoria', 'Saldo Físico', 'Saldo Reservado', 'Disponível Real', 'Status'];
    const rows = filteredMedicines.map((m) => {
      let physical = 0;
      if (m.physicalQuantity !== null && m.physicalQuantity !== undefined) {
        physical = m.physicalQuantity;
      } else if (m.totalQuantity !== null && m.totalQuantity !== undefined) {
        physical = m.totalQuantity;
      } else {
        physical = 0;
      }

      let reserved = 0;
      if (m.reservedQuantity !== null && m.reservedQuantity !== undefined) {
        reserved = m.reservedQuantity;
      } else {
        reserved = 0;
      }

      let available = 0;
      if (m.availableQuantity !== null && m.availableQuantity !== undefined) {
        available = m.availableQuantity;
      } else {
        if (physical > reserved) {
          available = physical - reserved;
        } else {
          available = 0;
        }
      }

      let statusStr = m.status;
      if (!statusStr) {
        statusStr = computeStockStatus({ totalQuantity: physical });
      }

      let ingredient = '—';
      if (m.activeIngredient) {
        ingredient = m.activeIngredient;
      } else {
        ingredient = '—';
      }

      let dosage = '—';
      if (m.dosage) {
        dosage = m.dosage;
      } else {
        dosage = '—';
      }

      let category = 'Geral';
      if (m.category) {
        category = m.category;
      } else {
        category = 'Geral';
      }

      return [
        m.name,
        ingredient,
        dosage,
        category,
        physical + ' un.',
        reserved + ' un.',
        available + ' un.',
        String(statusStr),
      ];
    });
    downloadCSV('catalogo_medicamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Catálogo exportado com sucesso!');
  };

  const columns: Column<Medicine>[] = [
    {
      header: 'Medicamento',
      width: '240px',
      cell: (med) => {
        let dosageElement: React.ReactNode = null;
        if (med.dosage) {
          dosageElement = (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
              {med.dosage}
            </p>
          );
        }

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                {med.name}
              </p>
              {dosageElement}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Categoria',
      width: '130px',
      cell: (med) => <CategoryBadge category={med.category} />,
    },
    {
      header: 'Princípio Ativo',
      cell: (med) => {
        let ingredient = '—';
        if (med.activeIngredient) {
          ingredient = med.activeIngredient;
        } else {
          ingredient = '—';
        }

        return (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {ingredient}
          </span>
        );
      },
    },
    {
      header: 'Saldo Físico',
      width: '110px',
      cell: (med) => {
        let physical = 0;
        if (med.physicalQuantity !== null && med.physicalQuantity !== undefined) {
          physical = med.physicalQuantity;
        } else if (med.totalQuantity !== null && med.totalQuantity !== undefined) {
          physical = med.totalQuantity;
        } else {
          physical = 0;
        }

        return (
          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {physical} un.
          </span>
        );
      },
    },
    {
      header: 'Reservado',
      width: '100px',
      cell: (med) => {
        let reserved = 0;
        if (med.reservedQuantity !== null && med.reservedQuantity !== undefined) {
          reserved = med.reservedQuantity;
        } else {
          reserved = 0;
        }

        if (reserved > 0) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {reserved} un.
            </span>
          );
        }

        return (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            0 un.
          </span>
        );
      },
    },
    {
      header: 'Disponível Real',
      width: '120px',
      cell: (med) => {
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
      header: 'Status',
      width: '140px',
      cell: (med) => {
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
    {
      header: 'Ações',
      width: '180px',
      align: 'right',
      cell: (med) => {
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

        let bCount = 0;
        if (med.batchesCount !== null && med.batchesCount !== undefined) {
          bCount = med.batchesCount;
        } else {
          bCount = 0;
        }

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedMedicineForDetails(med)}
              className="h-8 px-2.5 rounded-lg text-xs gap-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver</span>
            </Button>

            {(() => {
              if (canCreateMedicine) {
                if (bCount === 0 || physical === 0) {
                  return (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewlyCreatedMedicine(med);
                        setInitialBatchNumber('LOT-' + new Date().getFullYear() + '-001');
                        setInitialBatchQuantity(100);
                        const nextYear = new Date();
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        setInitialBatchExpiration(nextYear.toISOString().split('T')[0]);
                        setIsInitialBatchModalOpen(true);
                      }}
                      className="h-8 px-2 rounded-lg text-xs gap-1 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 font-bold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Lote</span>
                    </Button>
                  );
                }
              }
              return null;
            })()}

            {(() => {
              if (realAvail > 0) {
                return (
                  <Button
                    size="sm"
                    onClick={() => handleOpenAppointmentModal(med)}
                    className="h-8 px-2.5 rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar</span>
                  </Button>
                );
              } else if (physical > 0 && reserved >= physical) {
                return (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                    Reservado
                  </span>
                );
              }
              return null;
            })()}
          </div>
        );
      },
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Catálogo de Medicamentos"
          description="Consulte estoque físico, reservas em tempo real e agende dispensações na Farmácia Escola Universitária."
          icon={Pill}
          badge={
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Estoque FEFO &amp; Reserva Ativa
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
              {(() => {
                if (canCreateMedicine) {
                  return (
                    <Button
                      onClick={() => setIsCreateMedicineOpen(true)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-9 shadow-xs"
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

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome, princípio ativo ou dosagem..."
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

            {/* Taxonomy Stock Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todos os status</option>
                <option value="IN_STOCK">Disponível (Em dia)</option>
                <option value="CRITICAL_EXPIRATION">Vencimento Próximo (≤ 30d)</option>
                <option value="OUT_OF_STOCK">Sem Estoque</option>
                <option value="EXPIRED">Vencido</option>
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

        {/* ==================== MEDICINE DETAILS MODAL (LG) ==================== */}
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

              let batchesCount = 0;
              if (med.batchesCount !== null && med.batchesCount !== undefined) {
                batchesCount = med.batchesCount;
              } else {
                batchesCount = 0;
              }

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
                      <StockStatusBadge status={status} />
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

                  {/* Informações Básicas e Painel de Reserva */}
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

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <span className="text-slate-400 block font-medium">Princípio Ativo</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                      {activeIngredientText}
                    </span>
                  </div>

                  {/* Orientações ao Paciente */}
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

                  {/* Lotes Registrados */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-teal-600" />
                        Lotes Registrados ({batchesCount})
                      </h4>
                      {(() => {
                        if (canCreateMedicine) {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentMed = med;
                                setSelectedMedicineForDetails(null);
                                setNewlyCreatedMedicine(currentMed);
                                setInitialBatchNumber('LOT-' + new Date().getFullYear() + '-001');
                                setInitialBatchQuantity(100);
                                const nextYear = new Date();
                                nextYear.setFullYear(nextYear.getFullYear() + 1);
                                setInitialBatchExpiration(nextYear.toISOString().split('T')[0]);
                                setIsInitialBatchModalOpen(true);
                              }}
                              className="h-7 px-2 text-xs font-semibold gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 rounded-lg"
                            >
                              <Plus className="w-3 h-3" />
                              Novo Lote
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {(() => {
                      if (batchesCount === 0) {
                        return (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span>Nenhum lote cadastrado para este medicamento.</span>
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Estoque Físico Total:</span>
                            <span className="font-bold text-teal-700 dark:text-teal-300">{physicalQty} unidades</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer Ações */}
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

        {/* ==================== CREATE APPOINTMENT MODAL (MD) ==================== */}
        <Dialog
          open={selectedMedicineForAppointment !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMedicineForAppointment(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Agendar Retirada de Medicamento
              </DialogTitle>
              <DialogDescription>
                {(() => {
                  if (selectedMedicineForAppointment) {
                    let dosageStr = '';
                    if (selectedMedicineForAppointment.dosage) {
                      dosageStr = ' (' + selectedMedicineForAppointment.dosage + ')';
                    } else {
                      dosageStr = '';
                    }
                    return 'Agendando: ' + selectedMedicineForAppointment.name + dosageStr;
                  } else {
                    return 'Preencha as informações para agendar a dispensação.';
                  }
                })()}
              </DialogDescription>
            </DialogHeader>

            {selectedMedicineForAppointment && (() => {
              let physicalStock = 0;
              if (selectedMedicineForAppointment.physicalQuantity !== null && selectedMedicineForAppointment.physicalQuantity !== undefined) {
                physicalStock = selectedMedicineForAppointment.physicalQuantity;
              } else if (selectedMedicineForAppointment.totalQuantity !== null && selectedMedicineForAppointment.totalQuantity !== undefined) {
                physicalStock = selectedMedicineForAppointment.totalQuantity;
              } else {
                physicalStock = 0;
              }

              let reservedStock = 0;
              if (selectedMedicineForAppointment.reservedQuantity !== null && selectedMedicineForAppointment.reservedQuantity !== undefined) {
                reservedStock = selectedMedicineForAppointment.reservedQuantity;
              } else {
                reservedStock = 0;
              }

              let realAvailableStock = 0;
              if (selectedMedicineForAppointment.availableQuantity !== null && selectedMedicineForAppointment.availableQuantity !== undefined) {
                realAvailableStock = selectedMedicineForAppointment.availableQuantity;
              } else {
                if (physicalStock > reservedStock) {
                  realAvailableStock = physicalStock - reservedStock;
                } else {
                  realAvailableStock = 0;
                }
              }

              const isOverbooking = appointmentQuantity > realAvailableStock;

              return (
                <form onSubmit={handleCreateAppointment} className="space-y-4 py-2">
                  {/* Painel de Reserva e Anti-Overbooking */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Auditoria de Disponibilidade:</span>
                      <StockStatusBadge status={selectedMedicineForAppointment.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Saldo Físico</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{physicalStock} un.</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="block text-[10px] uppercase font-bold text-amber-500 tracking-wider">Reservado</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{reservedStock} un.</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Disponível Real</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{realAvailableStock} un.</span>
                      </div>
                    </div>

                    {(() => {
                      if (isOverbooking) {
                        return (
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                              <strong className="block font-bold">Bloqueio Anti-Overbooking:</strong>
                              A quantidade solicitada ({appointmentQuantity} un.) excede a disponibilidade real ({realAvailableStock} un.). Existem {reservedStock} un. reservadas para outros agendamentos pendentes.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Paciente (se staff) */}
                  {(() => {
                    if (!isPatient) {
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            Paciente *
                          </Label>
                          <Select
                            value={(() => {
                              if (selectedPatientId) {
                                return String(selectedPatientId);
                              } else {
                                return '';
                              }
                            })()}
                            onValueChange={(val) => {
                              setSelectedPatientId(Number(val));
                            }}
                          >
                            <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                              <SelectValue placeholder="Selecione o paciente..." />
                            </SelectTrigger>
                            <SelectContent>
                              {patients.map((p) => {
                                let cpfStr = '';
                                if (p.cpf) {
                                  cpfStr = ' (CPF: ' + p.cpf + ')';
                                } else {
                                  cpfStr = '';
                                }

                                return (
                                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                    {p.name}{cpfStr}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Data & Horário */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Data da Retirada *
                      </Label>
                      <Input
                        type="date"
                        required
                        value={appointmentDate}
                        onChange={(e) => {
                          setAppointmentDate(e.target.value);
                        }}
                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Horário Sugerido
                      </Label>
                      <Input
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => {
                          setAppointmentTime(e.target.value);
                        }}
                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Quantidade de Unidades *
                      </Label>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Máximo Disponível: {realAvailableStock} un.
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={appointmentQuantity}
                      onChange={(e) => {
                        setAppointmentQuantity(Math.max(1, Number(e.target.value)));
                      }}
                      className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  {/* Observações */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Observações / Prescrição
                    </Label>
                    <Textarea
                      rows={2}
                      placeholder="Informações da receita ou orientações..."
                      value={appointmentNotes}
                      onChange={(e) => {
                        setAppointmentNotes(e.target.value);
                      }}
                      className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedMedicineForAppointment(null);
                      }}
                      className="rounded-xl text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={(() => {
                        if (createAppointmentMutation.isPending) {
                          return true;
                        }
                        if (isOverbooking) {
                          return true;
                        }
                        if (realAvailableStock <= 0) {
                          return true;
                        }
                        return false;
                      })()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                    >
                      {(() => {
                        if (createAppointmentMutation.isPending) {
                          return 'Confirmando...';
                        }
                        return 'Confirmar Agendamento';
                      })()}
                    </Button>
                  </DialogFooter>
                </form>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ==================== CREATE MEDICINE MODAL (MD) COM DOSAGEM ESTRUTURADA ==================== */}
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

              {/* Formulário de Dosagem Estruturada: Input Numérico + Select de Unidade */}
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
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

        {/* ==================== MODAL GUIADO DE LOTE INICIAL ==================== */}
        <Dialog
          open={isInitialBatchModalOpen}
          onOpenChange={(open) => {
            setIsInitialBatchModalOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-1">
                <Boxes className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Adicionar Primeiro Lote
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                {(() => {
                  let medName = 'o medicamento';
                  if (newlyCreatedMedicine) {
                    medName = newlyCreatedMedicine.name;
                  }
                  return (
                    <span>
                      O medicamento <strong className="text-slate-900 dark:text-slate-100">{medName}</strong> foi cadastrado com sucesso! Cadastre agora o lote inicial para disponibilizar saldo físico para agendamentos e dispensações.
                    </span>
                  );
                })()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInitialBatch} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Número do Lote *
                </Label>
                <Input
                  required
                  placeholder="Ex: LOT-2026-001"
                  value={initialBatchNumber}
                  onChange={(e) => setInitialBatchNumber(e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Quantidade Inicial (Un.) *
                  </Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={initialBatchQuantity}
                    onChange={(e) => setInitialBatchQuantity(Math.max(1, Number(e.target.value)))}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Data de Validade *
                  </Label>
                  <Input
                    type="date"
                    required
                    value={initialBatchExpiration}
                    onChange={(e) => setInitialBatchExpiration(e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInitialBatchModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Pular por enquanto
                </Button>
                <Button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {(() => {
                    if (createBatchMutation.isPending) {
                      return 'Salvando Lote...';
                    }
                    return 'Adicionar Primeiro Lote';
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
