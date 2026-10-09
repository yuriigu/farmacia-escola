'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast-handler';
import { getRealAvailableQuantity, isMedicineAvailable } from '@/lib/stock';
import {
  Calendar, Plus, Check, CheckCheck, X, Clock, Download,
  Eye, Pill, Search, CalendarDays, User
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePermission } from '@/hooks/use-permission';
import {
  usePharmacyStore,
  fetchAppointmentsData,
  fetchBatchesData,
  fetchMedicinesData,
  fetchScheduleSlotsData,
} from '@/lib/pharmacy-store';
import type { Appointment, AppointmentDraft, AppointmentItem } from '@/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS, downloadCSV } from '@/lib/constants';
import { api } from '@/lib/api';
import { dateKeyOffsetLocal, formatDateKeyBr, isoFromLocalDateTime, todayKeyLocal, toDateKey } from '@/lib/dates';
import { maskCPF, onlyDigits } from '@/lib/masks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { AppointmentDetailsModal } from '@/components/modals/appointment-details-modal';
import type { Column } from '@/types';

// calcula o saldo disponivel real do medicamento. usa availablequantity
// quando a api manda; senao deriva de fisico - reservado (nunca abaixo
// de zero).
function getAvailableStock(medicine: { physicalQuantity?: number; totalQuantity?: number; reservedQuantity?: number; availableQuantity?: number }): number {
  return getRealAvailableQuantity(medicine);
}

// normaliza o nome do profissional da escala. o seed ja grava com
// titulo ("Farm. Luciana Mendes"), entao removemos qualquer prefixo
// existente (farm./dr./dra.) antes de reaplicar um unico "Farm. ".
// idempotente: "Farm. Luciana" -> "Farm. Luciana",
// "Luciana" -> "Farm. Luciana".
function formatProfessionalName(name?: string | null): string {
  const raw = (name ?? '').trim();
  if (!raw) {
    return 'Não informado';
  }
  const clean = raw.replace(/^(dra?\.?|farm\.?)\s+/i, '').trim();
  if (!clean) {
    return raw;
  }
  return `Farm. ${clean}`;
}

// modal de agendamento com foco em medico. existe porque medico tem
// um fluxo diferente: busca paciente por cpf (com autocomplete),
// prescreve varios medicamentos e usa slot de escala. os outros
// papeis usam o modal padrao mais abaixo.
function DoctorAppointmentModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { medicines, scheduleSlots } = usePharmacyStore();
  const [cpfInput, setCpfInput] = useState('');
  const [patientName, setPatientName] = useState('');
  const [items, setItems] = useState<Array<{ medicineId: number; quantity: number }>>([{ medicineId: 0, quantity: 1 }]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [slotId, setSlotId] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [cpfSuggestions, setCpfSuggestions] = useState<Array<{ id: number; name: string; cpf: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCpf, setSearchingCpf] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ cpfInput?: string; patientName?: string; items?: string; scheduledDate?: string; slotId?: string }>({});
  // erro global do modal do medico (ex: slot lotado vindo do backend).
  const [formError, setFormError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // limpa todos os campos do formulario. chamado no sucesso e no
  // cancelar.
  const cleanForm = useCallback(() => {
    setCpfInput('');
    setPatientName('');
    setItems([{ medicineId: 0, quantity: 1 }]);
    setScheduledDate('');
    setSlotId(0);
    setNotes('');
    setCpfSuggestions([]);
    setShowSuggestions(false);
    setFieldErrors({});
  }, []);

  // fecha o dropdown de sugestoes ao clicar fora dele.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // autocomplete de cpf: com 3+ digitos, busca pacientes do historico
  // via /lib/api. usa debounce de 300ms pra nao bombardear a api a
  // cada tecla.
  const handleCpfChange = useCallback((value: string) => {
    const formatted = maskCPF(value);
    setCpfInput(formatted);
    const digits = onlyDigits(formatted);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (digits.length >= 3) {
      setSearchingCpf(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await api.getPatients(digits);
          const mappedResults = results.map((patient) => ({
            id: patient.id,
            name: patient.name,
            cpf: patient.cpf,
          }));
          setCpfSuggestions(mappedResults);
          setShowSuggestions(mappedResults.length > 0);
        } catch {
          setCpfSuggestions([]);
        } finally {
          setSearchingCpf(false);
        }
      }, 300);
    } else {
      setCpfSuggestions([]);
      setShowSuggestions(false);
      setSearchingCpf(false);
    }
  }, []);

  // clique numa sugestao preenche cpf formatado e nome do paciente.
  const selectSuggestion = (suggestion: { name: string; cpf: string }) => {
    setCpfInput(maskCPF(suggestion.cpf));
    setPatientName(suggestion.name);
    setShowSuggestions(false);
    setCpfSuggestions([]);
  };

  // submit do agendamento medico. valida medicamentos, data, slot,
  // cpf e nome, e checa saldo real (soma por medicamento) antes de
  // chamar a api.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const nextErrors: typeof fieldErrors = {};
    if (items.some((item) => !item.medicineId || item.quantity < 1)) {
      nextErrors.items = 'Selecione o medicamento e informe uma quantidade válida em todas as linhas.';
    }
    if (!scheduledDate) {
      nextErrors.scheduledDate = 'Selecione a data do agendamento.';
    }
    const selectedSlot = scheduleSlots.find((slot) => slot.id === slotId);
    if (!selectedSlot || !selectedSlot.active || selectedSlot.date.slice(0, 10) !== scheduledDate) {
      nextErrors.slotId = 'Selecione um horário disponível na escala.';
    } else if (Math.max(0, selectedSlot.maxCapacity - (selectedSlot._count?.appointments ?? 0)) === 0) {
      nextErrors.slotId = 'Este horário da escala está lotado.';
    }

    const digits = onlyDigits(cpfInput);
    if (digits.length !== 11) {
      nextErrors.cpfInput = 'CPF inválido. Informe um CPF completo com 11 dígitos.';
    }
    if (!patientName.trim()) {
      nextErrors.patientName = 'Informe o nome do paciente.';
      return;
    }

    // soma o que foi pedido por medicamento. isso cobre o caso do
    // mesmo medicamento aparecer em varias linhas.
    const requestedByMedicine = new Map<number, number>();
    items.forEach((item) => requestedByMedicine.set(item.medicineId, (requestedByMedicine.get(item.medicineId) ?? 0) + item.quantity));
    for (const [requestedMedicineId, requestedQuantity] of requestedByMedicine) {
      const selectedMed = medicines.find((medicine) => medicine.id === requestedMedicineId);
      const availableStock = selectedMed ? getAvailableStock(selectedMed) : 0;
      if (!selectedMed || requestedQuantity > availableStock) {
        nextErrors.items = `Estoque insuficiente: a quantidade solicitada (${requestedQuantity} un.) excede o saldo disponível (${availableStock} un.).`;
        break;
      }
    }
    setFieldErrors(nextErrors);
    const firstInvalidField = ['cpfInput', 'patientName', 'items', 'scheduledDate', 'slotId'].find((field) => nextErrors[field as keyof typeof nextErrors]);
    if (firstInvalidField) {
      document.getElementById(`doctor-appointment-${firstInvalidField}`)?.focus();
      return;
    }

    try {
      setLoading(true);
      if (!selectedSlot) return;
      // combina a data escolhida com o horario do slot pra montar
      // o datetime completo.
      const dateVal = isoFromLocalDateTime(scheduledDate, selectedSlot.timeSlot);
      const timeVal = selectedSlot.timeSlot;

      let notesVal: string | undefined = undefined;
      if (notes.trim().length > 0) {
        notesVal = notes.trim();
      } else {
        notesVal = undefined;
      }

      // aqui chamamos o cliente http (/lib/api.ts) pra criar o
      // agendamento medico no backend.
      await api.createAppointment({
        items,
        patientName: patientName.trim(),
        patientCpf: digits,
        scheduledDate: dateVal,
        scheduledTime: timeVal,
        slotId: selectedSlot.id,
        notes: notesVal,
      });

      toast.success('Agendamento médico realizado com sucesso!');
      cleanForm();
      onOpenChange(false);
      void fetchAppointmentsData();
      void fetchScheduleSlotsData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errMessage = 'Erro ao criar agendamento médico.';
      if (error) {
        if (error.error) {
          errMessage = error.error;
        } else {
          errMessage = 'Erro ao criar agendamento médico.';
        }
      } else {
        errMessage = 'Erro ao criar agendamento médico.';
      }
      setFormError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setFieldErrors({});
        setFormError('');
      }
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            Novo Agendamento Médico
          </DialogTitle>
          <DialogDescription>
            Prescreva e agende a retirada de medicamentos para o paciente via CPF.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          <FormError message={formError} />
          {/* cpf com autocomplete: digita 3+ digitos pra ver sugestoes
              do historico de pacientes do medico. */}
          <div className="relative" ref={suggestionsRef}>
            <Label htmlFor="doctor-appointment-cpfInput" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
              CPF do Paciente
            </Label>
            <div className="relative">
              <Input
                id="doctor-appointment-cpfInput"
                type="text"
                placeholder="000.000.000-00"
                value={cpfInput}
                aria-invalid={!!fieldErrors.cpfInput}
                aria-describedby={fieldErrors.cpfInput ? 'doctor-appointment-cpfInput-error' : undefined}
                onChange={(e) => {
                  handleCpfChange(e.target.value);
                  setFieldErrors((current) => ({ ...current, cpfInput: undefined }));
                }}
                maxLength={14}
                className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
              {/* spinner enquanto busca sugestoes */}
              {(() => {
                if (searchingCpf) {
                  return (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            {fieldErrors.cpfInput && <FieldError id="doctor-appointment-cpfInput-error" message={fieldErrors.cpfInput} />}

            {/* dropdown de sugestoes de pacientes */}
            {(() => {
              if (showSuggestions) {
                if (cpfSuggestions.length > 0) {
                  return (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      <div className="p-1.5 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-3">
                        Pacientes anteriores
                      </div>
                      {cpfSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectSuggestion(s)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{maskCPF(s.cpf)}</span>
                        </button>
                      ))}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>

          {/* nome do paciente */}
          <div>
            <Label htmlFor="doctor-appointment-patientName" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
              Nome do Paciente
            </Label>
            <Input
              id="doctor-appointment-patientName"
              type="text"
              placeholder="Nome completo do paciente"
              value={patientName}
              aria-invalid={!!fieldErrors.patientName}
              aria-describedby={fieldErrors.patientName ? 'doctor-appointment-patientName-error' : undefined}
              onChange={(e) => {
                setPatientName(e.target.value);
                setFieldErrors((current) => ({ ...current, patientName: undefined }));
              }}
              className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {fieldErrors.patientName && <FieldError id="doctor-appointment-patientName-error" message={fieldErrors.patientName} />}
          </div>

          {/* lista de medicamentos prescritos, com saldo em tempo real.
              cada linha mostra o saldo disponivel e destaca em vermelho
              se passar. */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Medicamentos do atendimento</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItems((current) => [...current, { medicineId: 0, quantity: 1 }])}
                className="h-8 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                + Adicionar outro medicamento
              </Button>
            </div>
            {items.map((item, index) => {
              const selectedMed = medicines.find((medicine) => medicine.id === item.medicineId);
              const availableStock = selectedMed ? getAvailableStock(selectedMed) : 0;
              const isOver = Boolean(selectedMed && item.quantity > availableStock);
              return (
                <div key={index} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-2 items-end">
                    <div>
                      <Label className="mb-1 block text-[11px] font-semibold text-slate-500">Medicamento</Label>
                      <Select value={item.medicineId ? String(item.medicineId) : ''} onValueChange={(value) => {
                        setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, medicineId: Number(value) } : entry));
                        setFieldErrors((current) => ({ ...current, items: undefined }));
                      }}>
                        <SelectTrigger id={index === 0 ? 'doctor-appointment-items' : undefined} aria-invalid={!!fieldErrors.items} aria-describedby={fieldErrors.items ? 'doctor-appointment-items-error' : undefined} className="rounded-lg"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {medicines.map((medicine) => <SelectItem key={medicine.id} value={String(medicine.id)}>{medicine.name}{medicine.dosage ? ` — ${medicine.dosage}` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1 block text-[11px] font-semibold text-slate-500">Quantidade</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={(event) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Math.max(1, Number(event.target.value)) } : entry))} className="rounded-lg" />
                    </div>
                    {items.length > 1 && <Button type="button" variant="ghost" onClick={() => setItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} size="icon" className="text-slate-400 hover:text-rose-600" aria-label="Remover medicamento">×</Button>}
                  </div>
                  {/* saldo em tempo real: verde se ok, vermelho se estourou */}
                  {selectedMed && <div className={`text-[11px] font-medium ${isOver ? 'text-rose-600' : 'text-emerald-700'}`}>Saldo disponível: {availableStock} un.{isOver ? ` · solicitado: ${item.quantity} un.` : ''}</div>}
                </div>
              );
            })}
            {fieldErrors.items && <FieldError id="doctor-appointment-items-error" message={fieldErrors.items} />}
          </div>

          {/* data + slot. o select de horario filtra pelos slots da
              data escolhida e so aceita os que ainda tem vaga. */}
          <div>
            <Label htmlFor="doctor-appointment-scheduledDate" className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
              Data e Horário (Slot)
            </Label>
            <Input id="doctor-appointment-scheduledDate" type="date" aria-invalid={!!fieldErrors.scheduledDate} aria-describedby={fieldErrors.scheduledDate ? 'doctor-appointment-scheduledDate-error' : undefined} value={scheduledDate} onChange={(e) => { setScheduledDate(e.target.value); setSlotId(0); setFieldErrors((current) => ({ ...current, scheduledDate: undefined, slotId: undefined })); }} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            {fieldErrors.scheduledDate && <FieldError id="doctor-appointment-scheduledDate-error" message={fieldErrors.scheduledDate} />}
            <Select value={slotId ? String(slotId) : ''} onValueChange={(value) => { setSlotId(Number(value)); setFieldErrors((current) => ({ ...current, slotId: undefined })); }}>
              <SelectTrigger id="doctor-appointment-slotId" aria-invalid={!!fieldErrors.slotId} aria-describedby={fieldErrors.slotId ? 'doctor-appointment-slotId-error' : undefined} className="w-full min-w-0 overflow-hidden text-left mt-2 rounded-xl border-slate-200 dark:border-slate-600"><SelectValue className="truncate" placeholder="Selecione um horário com vagas..." /></SelectTrigger>
              <SelectContent>
                {scheduleSlots.filter((slot) => {
                  if (!slot.active) {
                    return false;
                  }
                  if (slot.date.slice(0, 10) !== scheduledDate) {
                    return false;
                  }
                  return true;
                }).map((slot) => {
                  let booked = 0;
                  if (slot._count) {
                    if (slot._count.appointments) {
                      booked = slot._count.appointments;
                    }
                  }
                  const free = slot.maxCapacity - booked;
                  let pharmacist = 'Não informado';
                  if (slot.assignedTo) {
                    pharmacist = formatProfessionalName(slot.assignedTo.name);
                  }
                  return <SelectItem key={slot.id} value={String(slot.id)} disabled={free <= 0}>{slot.timeSlot} — ({free}/{slot.maxCapacity} vagas) — {pharmacist}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            {fieldErrors.slotId && <FieldError id="doctor-appointment-slotId-error" message={fieldErrors.slotId} />}
          </div>

          {/* observacoes livres */}
          <div>
            <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
              Observações (opcional)
            </Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Orientações..."
              className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { cleanForm(); onOpenChange(false); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {(() => {
                if (loading) {
                  return 'Agendando...';
                } else {
                  return 'Agendar';
                }
              })()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// pagina de agendamentos. e a tela em lista, complementar ao overview
// do calendario. mostra consultas com filtros, permite criar/confirmar/
// concluir/cancelar e trata tanto paciente quanto equipe (inclusive
// medico, que tem um modal proprio).
export function AppointmentsPage() {
  const searchParams = useSearchParams();
  const newParam = searchParams.get('new');
  const medIdParam = searchParams.get('medicineId') ?? searchParams.get('medid');
  const statusParam = searchParams.get('status');

  // a url pode abrir o modal direto: ?new=1 (generico) ou
  // ?medicineid=n (vindo da tela de medicamentos).
  // ?status=PENDING (vindo do card "Aguardando Confirmação" do
  // dashboard) preseleciona o chip de pendentes; qualquer outro
  // valor cai em ALL.
  const ALLOWED_STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  let initialStatusFilter = 'ALL';
  if (statusParam) {
    const normalizedStatus = statusParam.trim().toUpperCase();
    if (ALLOWED_STATUS_FILTERS.includes(normalizedStatus)) {
      initialStatusFilter = normalizedStatus;
    }
  }
  let initialNew = false;
  if (newParam === '1') {
    initialNew = true;
  } else if (medIdParam) {
    initialNew = true;
  } else {
    initialNew = false;
  }

  let initialMedId = 0;
  if (medIdParam) {
    initialMedId = Number(medIdParam);
  } else {
    initialMedId = 0;
  }

  const { appointments, medicines, patients, scheduleSlots, loading } = usePharmacyStore();
  const [modalOpen, setModalOpen] = useState(initialNew);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [receipt, setReceipt] = useState<(Appointment & { allocatedItems?: Array<{ batchNumber: string }> }) | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [formErrors, setFormErrors] = useState<{ items?: string; scheduledDate?: string; slotId?: string; patientId?: string }>({});
  // erro global do modal de criar agendamento (ex: slot lotado).
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [patientSearch, setPatientSearch] = useState('');
  const user = useAuthStore((s) => {
    return s.user;
  });

  // detecta se o usuario e paciente (muda escopo, textos e acoes).
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

  // detecta se o usuario e medico (usa o modal proprio dele e nao
  // ve o modal padrao).
  let isMedico = false;
  if (user) {
    if (user.role === 'MEDICO') {
      isMedico = true;
    } else {
      isMedico = false;
    }
  } else {
    isMedico = false;
  }

  // permissao granular de alteracao de status (confirmar/concluir).
  // o backend (role-middleware) concede APPOINTMENTS_UPDATE apenas a
  // ADMIN, FARMACEUTICO e ALUNO — PACIENTE e MEDICO ficam sem acesso.
  // mantemos tambem as travas explicitas de papel porque o
  // canWriteClient do frontend ainda libera 'appointments' para
  // MEDICO/PACIENTE (escrita ampla), o que nao reflete o UPDATE real.
  const canUpdateAppointment = usePermission('APPOINTMENTS_UPDATE');
  const canManageAppointmentStatus = canUpdateAppointment && !isPatient && !isMedico;

  const defaultForm: AppointmentDraft = {
    items: [{ medicineId: initialMedId, quantity: 1 }],
    scheduledDate: dateKeyOffsetLocal(1),
    scheduledTime: '',
    patientId: undefined,
    notes: '',
  };
  const [form, setForm] = useState<AppointmentDraft>(defaultForm);
  const [, setLoadingPatients] = useState(false);

  // slots ativos na data escolhida no formulario. e o que alimenta o
  // select de horario no modal padrao.
  const availableSlotsForDate = scheduleSlots.filter((slot) => {
    if (!slot.active) {
      return false;
    }
    if (!form.scheduledDate) {
      return false;
    }
    if (slot.date.slice(0, 10) !== form.scheduledDate.slice(0, 10)) {
      return false;
    }
    return true;
  });
  const patientSuggestions = patients.filter((patient) => {
    const term = patientSearch.trim().toLowerCase();
    const cpfTerm = patientSearch.replace(/\D/g, '');
    return term.length >= 2 && (
      patient.name.toLowerCase().includes(term) ||
      (cpfTerm.length > 0 && patient.cpf.includes(cpfTerm))
    );
  }).slice(0, 6);

  // carrega slots uma vez ao montar.
  useEffect(() => {
    if (usePharmacyStore.getState().scheduleSlots.length === 0) {
      void fetchScheduleSlotsData();
    }
  }, []);

  // escuta o evento customizado do calendario (calendar:gotoappointments)
  // pra abrir o modal com a data/slot pre-preenchidos quando o usuario
  // clica num slot no overview.
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ date?: string; time?: string; slotId?: number }>;
      let nextForm = defaultForm;
      if (customEvent.detail) {
        if (customEvent.detail.date) {
          nextForm = {
            ...nextForm,
            scheduledDate: customEvent.detail.date,
            scheduledTime: customEvent.detail.time,
            slotId: customEvent.detail.slotId,
          };
        }
      }
      setForm(nextForm);
      setPatientSearch('');
      setModalOpen(true);
    };
    window.addEventListener('calendar:goToAppointments', handler);
    return () => window.removeEventListener('calendar:goToAppointments', handler);
  }, []);

  // quando o modal padrao abre pra equipe, garante que a lista de
  // pacientes esteja carregada (o select precisa dela).
  useEffect(() => {
    if (isPatient) {
      return;
    }
    if (isMedico) {
      return;
    }
    if (!modalOpen) {
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoadingPatients(true);
        const data = await api.getPatients();
        if (active) {
          usePharmacyStore.setState({ patients: data });
        }
      } catch {
        // se der erro, segue com o que ja tem na store.
      } finally {
        if (active) {
          setLoadingPatients(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [modalOpen, isPatient, isMedico]);

  // submit do modal padrao. valida campos obrigatorios, checa
  // estoque real do medicamento e monta o payload. paciente nao
  // manda patientid (o backend amarra ao dono do token).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const nextErrors: typeof formErrors = {};
    if (form.items.length === 0 || form.items.some((item) => !item.medicineId || item.quantity < 1)) {
      nextErrors.items = 'Selecione um medicamento e informe uma quantidade válida.';
    }
    if (!form.scheduledDate) {
      nextErrors.scheduledDate = 'Selecione uma data para o agendamento.';
    }
    if (!form.slotId) {
      nextErrors.slotId = 'Selecione um horário disponível na escala.';
    }
    if (!isPatient && !isMedico && !form.patientId) {
      nextErrors.patientId = 'Selecione o paciente.';
    }

    const invalidItem = form.items.find((item) => {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      if (!medicine) return true;
      return isPatient
        ? !isMedicineAvailable(medicine, true)
        : item.quantity > getAvailableStock(medicine);
    });
    if (invalidItem) {
      const medicine = medicines.find((entry) => entry.id === invalidItem.medicineId);
      nextErrors.items = isPatient
        ? 'Este medicamento não está disponível para agendamento no momento.'
        : `Estoque insuficiente: a quantidade solicitada (${invalidItem.quantity} un.) excede o saldo disponível real (${medicine ? getAvailableStock(medicine) : 0} un.).`;
    }
    setFormErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      document.getElementById(`appointment-form-${firstInvalidField}`)?.focus();
      return;
    }

    try {
      // monta o datetime a partir da data + hora do formulario.
      const timeVal = form.scheduledTime || '00:00';
      const dateVal = isoFromLocalDateTime(form.scheduledDate, timeVal);

      let notesVal: string | undefined = undefined;
      if (form.notes) {
        notesVal = form.notes;
      } else {
        notesVal = undefined;
      }

      const payload: any = {
        items: form.items,
        scheduledDate: dateVal,
        scheduledTime: timeVal,
        slotId: form.slotId,
        notes: notesVal,
      };
      if (!isPatient) {
        payload.patientId = form.patientId;
      }

      // aqui chamamos o cliente http (/lib/api.ts) pra criar.
      await api.createAppointment(payload);
      toast.success('Agendamento criado com sucesso!');
      setForm(defaultForm);
      setPatientSearch('');
      setModalOpen(false);
      void fetchAppointmentsData();
      void fetchScheduleSlotsData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errMessage = 'Erro ao criar agendamento.';
      if (error) {
        if (error.error) {
          errMessage = error.error;
        } else {
          errMessage = 'Erro ao criar agendamento.';
        }
      } else {
        errMessage = 'Erro ao criar agendamento.';
      }
      setFormError(errMessage);
    }
  };

  // cancela um agendamento. exige justificativa; o backend libera a
  // reserva de estoque quando recebe cancelled.
  const handleCancelAppointment = async () => {
    if (!cancelTarget) {
      return;
    }
    if (!cancelReason.trim()) {
      setCancelReasonError('A justificativa do cancelamento é obrigatória.');
      document.getElementById('appointment-cancel-reason')?.focus();
      return;
    }
    setCancelReasonError('');
    try {
      await api.cancelAppointment(cancelTarget.id, cancelReason.trim());
      toast.success('Agendamento cancelado e reserva liberada.');
      setCancelTarget(null);
      setCancelReason('');
      void fetchAppointmentsData();
      void fetchScheduleSlotsData();
    } catch {
      toast.error('Erro ao cancelar agendamento.');
    }
  };

  // exporta em csv os agendamentos filtrados.
  const handleExportCSV = () => {
    const header = ['Medicamento', 'Dosagem', 'Paciente', 'CPF', 'Data Agendada', 'Status', 'Observações'];
    const rows = filteredAppointments.map((a) => {
      const dateKey = toDateKey(a.scheduledDate);
      let dateLabel = dateKey ? formatDateKeyBr(dateKey) : '-';
      if (a.scheduledTime) {
        dateLabel += ` ${a.scheduledTime}`;
      }

      let medName = '';
      let medDosage = '';
      if (a.items) {
        if (a.items.length > 0) {
          const first = a.items[0];
          if (first) {
            if (first.medicine) {
              if (first.medicine.name) {
                medName = first.medicine.name;
              }
              if (first.medicine.dosage) {
                medDosage = first.medicine.dosage;
              }
            }
          }
        }
      }

      let patientName = '';
      let patientCpf = '';
      if (a.patient) {
        if (a.patient.name) {
          patientName = a.patient.name;
        }
        if (a.patient.cpf) {
          patientCpf = a.patient.cpf;
        }
      }

      let notesVal = '';
      if (a.notes) {
        notesVal = a.notes;
      }

      return [
        medName,
        medDosage,
        patientName,
        patientCpf,
        dateLabel,
        a.status,
        notesVal,
      ];
    });
    downloadCSV('agendamentos_' + todayKeyLocal() + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  // filtro da listagem. combina status e busca por texto, onde o
  // texto cobre nome/cpf do paciente, nome/dosagem do medicamento
  // e observacoes.
  const filteredAppointments = appointments.filter((app) => {
    let matchesStatus = false;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (app.status === statusFilter) {
      matchesStatus = true;
    } else {
      matchesStatus = false;
    }

    const term = searchTerm.toLowerCase();
    let patientMatch = false;
    if (app.patient) {
      if (app.patient.name) {
        if (app.patient.name.toLowerCase().includes(term)) {
          patientMatch = true;
        }
      }
      if (app.patient.cpf) {
        if (app.patient.cpf.includes(searchTerm)) {
          patientMatch = true;
        }
      }
    }

    let medMatch = false;
    if (app.items) {
      for (let i = 0; i < app.items.length; i++) {
        const it = app.items[i];
        if (it.medicine) {
          if (it.medicine.name) {
            if (it.medicine.name.toLowerCase().includes(term)) {
              medMatch = true;
              break;
            }
          }
          if (it.medicine.dosage) {
            if (it.medicine.dosage.toLowerCase().includes(term)) {
              medMatch = true;
              break;
            }
          }
        }
      }
    }

    let notesMatch = false;
    if (app.notes) {
      if (app.notes.toLowerCase().includes(term)) {
        notesMatch = true;
      }
    }

    let matchesSearch = false;
    if (patientMatch) {
      matchesSearch = true;
    } else if (medMatch) {
      matchesSearch = true;
    } else if (notesMatch) {
      matchesSearch = true;
    }

    if (matchesStatus && matchesSearch) {
      return true;
    }
    return false;
  });

  // colunas da tabela de agendamentos.
  const columns: Column<Appointment>[] = [
    {
      header: 'Data & Horário',
      width: '180px',
      cell: (app) => {
        // data formatada em pt-br e hora (com fallback pra hora do
        // proprio date quando nao houver scheduledtime).
        const scheduled = new Date(app.scheduledDate);
        const dateStr = formatDateKeyBr(toDateKey(app.scheduledDate));

        let timeStr = '';
        if (app.scheduledTime) {
          timeStr = app.scheduledTime;
        } else if (!Number.isNaN(scheduled.getTime())) {
          timeStr = scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else {
          timeStr = '';
        }

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight">
                {dateStr}
              </p>
              {(() => {
                if (timeStr.length > 0) {
                  return (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {timeStr}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Paciente',
      width: '200px',
      cell: (app) => {
        // nome com fallback pro proprio usuario quando for paciente.
        // cpf formatado com a mascara.
        let name = 'Não informado';
        if (app.patient) {
          if (app.patient.name) {
            name = app.patient.name;
          } else if (isPatient) {
            if (user) {
              if (user.name) {
                name = user.name;
              }
            }
          }
        } else if (isPatient) {
          if (user) {
            if (user.name) {
              name = user.name;
            }
          }
        }

        let formattedCpf: string | null = null;
        if (app.patient) {
          if (app.patient.cpf) {
            formattedCpf = maskCPF(app.patient.cpf);
          }
        }

        return (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm line-clamp-1">
              {name}
            </p>
            {(() => {
              if (formattedCpf) {
                return <p className="text-[11px] text-slate-400 font-mono mt-0.5">{formattedCpf}</p>;
              }
              return null;
            })()}
          </div>
        );
      },
    },
    {
      header: 'Medicamento(s)',
      cell: (app) => {
        // primeiro medicamento em destaque + badge com a contagem dos
        // demais, quando existirem.
        let firstItem: AppointmentItem | undefined = undefined;
        if (app.items) {
          if (app.items.length > 0) {
            firstItem = app.items[0];
          }
        }

        let medName = 'Medicamento não especificado';
        let dosage: string | undefined = undefined;
        let qty = 1;
        if (firstItem) {
          if (firstItem.medicine) {
            if (firstItem.medicine.name) {
              medName = firstItem.medicine.name;
            }
            if (firstItem.medicine.dosage) {
              dosage = firstItem.medicine.dosage;
            }
          }
          if (firstItem.quantity) {
            qty = firstItem.quantity;
          }
        }

        let totalItems = 0;
        if (app.items) {
          totalItems = app.items.length;
        }

        let dosageElement: React.ReactNode = null;
        if (dosage) {
          dosageElement = <span className="text-slate-400 text-xs">({dosage})</span>;
        }

        let extraBadge: React.ReactNode = null;
        if (totalItems > 1) {
          extraBadge = (
            <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              +{totalItems - 1} outro(s)
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {medName} {dosageElement}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quantidade: <span className="font-semibold text-slate-700 dark:text-slate-300">{qty} un.</span>
                {extraBadge}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (app) => {
        // badge de status com cor/label do map de constants.
        let statusClass = APPOINTMENT_STATUS_STYLES.PENDING;
        if (APPOINTMENT_STATUS_STYLES[app.status]) {
          statusClass = APPOINTMENT_STATUS_STYLES[app.status];
        }
        let statusLabel: string = app.status;
        if (APPOINTMENT_STATUS_LABELS[app.status]) {
          statusLabel = APPOINTMENT_STATUS_LABELS[app.status];
        }

        return (
          <Badge
            variant="outline"
            className={'font-semibold text-[11px] ' + statusClass}
          >
            {statusLabel}
          </Badge>
        );
      },
    },
    {
      header: 'Ações',
      align: 'right',
      width: '140px',
      cell: (app) => {
        // paciente cancela os proprios (pending/confirmed); equipe
        // autorizada (APPOINTMENTS_UPDATE: ADMIN, FARMACEUTICO, ALUNO)
        // confirma/conclui/cancela. PACIENTE e MEDICO nao veem essas
        // acoes de alteracao de status.
        let patientCanCancel = false;
        if (isPatient) {
          if (app.status === 'PENDING') {
            patientCanCancel = true;
          } else if (app.status === 'CONFIRMED') {
            patientCanCancel = true;
          }
        }

        let staffCanAct = false;
        if (canManageAppointmentStatus) {
          if (app.status === 'PENDING') {
            staffCanAct = true;
          } else if (app.status === 'CONFIRMED') {
            staffCanAct = true;
          }
        }

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedAppointment(app)}
              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Visualizar detalhes"
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* cancelar como paciente */}
            {(() => {
              if (patientCanCancel) {
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCancelTarget(app);
                      setCancelReason('');
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    title="Cancelar agendamento"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                );
              }
              return null;
            })()}

            {/* acoes da equipe: concluir, confirmar, cancelar */}
            {(() => {
              if (staffCanAct) {
                return (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const withdrawal = await api.completeAppointment(app.id);
                          setReceipt(withdrawal);
                          toast.success('Atendimento concluído!');
                          void fetchAppointmentsData();
                          void fetchScheduleSlotsData();
                          void fetchMedicinesData();
                          void fetchBatchesData();
                        } catch {
                          toast.error('Erro ao concluir atendimento.');
                        }
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
                      title="Concluir Agendamento"
                      aria-label="Concluir Agendamento"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>

                    {/* confirmar so quando pending */}
                    {(() => {
                      if (app.status === 'PENDING') {
                        return (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await api.confirmAppointment(app.id);
                                toast.success('Agendamento confirmado.');
                                void fetchAppointmentsData();
                                void fetchScheduleSlotsData();
                              } catch {
                                toast.error('Erro ao confirmar.');
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
                            title="Confirmar Agendamento"
                            aria-label="Confirmar Agendamento"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        );
                      }
                      return null;
                    })()}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCancelTarget(app);
                        setCancelReason('');
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      title="Cancelar Agendamento"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                );
              }
              return null;
            })()}
          </div>
        );
      },
    },
  ];

  // descricao do cabecalho muda conforme o papel do usuario.
  let headerDesc = 'Controle de agendamentos e consultas farmacêuticas da Farmácia Escola';
  if (isMedico) {
    headerDesc = 'Agendamentos e prescrições médicas de retirada';
  } else if (isPatient) {
    headerDesc = 'Acompanhe as datas e horários dos seus atendimentos agendados';
  } else {
    headerDesc = 'Controle de agendamentos e consultas farmacêuticas da Farmácia Escola';
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto page-enter">
      {/* cabecalho com acoes contextuais: exportar (nao-paciente/nao-medico),
          botao de abrir modal (o proprio doctorappointmentmodal pro
          medico, ou o padrao pros demais). */}
      <PageHeader
        title="Agendamentos de Retirada"
        description={headerDesc}
        icon={Calendar}
        actions={
          <>
            {(() => {
              if (!isPatient) {
                if (!isMedico) {
                  return (
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={filteredAppointments.length === 0}
                      className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar CSV</span>
                    </Button>
                  );
                }
              }
              return null;
            })()}
            {(() => {
              if (isMedico) {
                return modalOpen
                  ? <DoctorAppointmentModal open onOpenChange={setModalOpen} />
                  : null;
              }
              return null;
            })()}
            <Button
              onClick={() => {
                if (isMedico) {
                  setModalOpen(true);
                } else {
                  setForm(defaultForm);
                  setPatientSearch('');
                  setModalOpen(true);
                }
              }}
              className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </Button>
          </>
        }
      />

      {/* barra de filtros: busca + chips de status */}
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
          {/* botao de limpar busca */}
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

        {/* chips de filtro de status, com scroll horizontal em telas
            pequenas. */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'COMPLETED', label: 'Concluídos' },
            { id: 'CANCELLED', label: 'Cancelados' },
          ].map((tab) => {
            let chipClass = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
            if (statusFilter === tab.id) {
              chipClass = 'bg-emerald-600 text-white shadow-sm';
            } else {
              chipClass = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
            }
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ' + chipClass}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* tabela de agendamentos, com empty state e clique na linha */}
      <DataTable
        columns={columns}
        data={filteredAppointments}
        isLoading={loading}
        emptyIcon={CalendarDays}
        emptyTitle="Nenhum agendamento encontrado"
        emptyDescription="Não há agendamentos correspondentes aos critérios da busca."
        emptyAction={
          <Button
            onClick={() => {
              if (isMedico) {
                setModalOpen(true);
              } else {
                setForm(defaultForm);
                setPatientSearch('');
                setModalOpen(true);
              }
            }}
            className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Agendamento
          </Button>
        }
        onRowClick={(app) => setSelectedAppointment(app)}
      />

      {/* modal de detalhe do agendamento selecionado, compartilhado
          com a aba /calendar. acoes de status pra equipe nao-medico. */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}
        onComplete={(withdrawal) => setReceipt(withdrawal as (Appointment & { allocatedItems?: Array<{ batchNumber: string }> }))}
      />

      {/* modal padrao de criacao (nao-medico). o medico usa o
          doctorappointmentmodal la em cima. */}
      {(() => {
        if (!isMedico) {
          return (
            <Dialog open={modalOpen} onOpenChange={(open) => {
              if (open) {
                setFormErrors({});
                setFormError('');
              }
              setModalOpen(open);
            }}>
              <DialogContent className="sm:max-w-xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Novo Agendamento
                  </DialogTitle>
                  <DialogDescription>
                    {isPatient
                      ? 'Agende a data e o horário para retirar seu medicamento gratuito.'
                      : 'Registre um novo agendamento de atendimento farmacêutico.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
                  <FormError message={formError} />
                  {(() => {
                    if (!isPatient) {
                      return (
                        <div className="space-y-1.5">
                          <Label htmlFor="appointment-form-patientId" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            Paciente *
                          </Label>
                          <div className="relative">
                            <Input
                              id="appointment-form-patientId"
                              aria-invalid={!!formErrors.patientId}
                              aria-describedby={formErrors.patientId ? 'appointment-form-patientId-error' : undefined}
                              value={patientSearch || patients.find((patient) => patient.id === form.patientId)?.name || ''}
                              onChange={(event) => {
                                setPatientSearch(event.target.value);
                                setForm({ ...form, patientId: undefined });
                                setFormErrors((current) => ({ ...current, patientId: undefined }));
                              }}
                              placeholder="Buscar por nome ou CPF"
                              className="rounded-xl text-xs"
                            />
                            {patientSuggestions.length > 0 && (
                              <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white p-1 shadow-lg dark:bg-slate-800">
                                {patientSuggestions.map((patient) => (
                                  <button
                                    type="button"
                                    key={patient.id}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50"
                                    onClick={() => {
                                      setForm({ ...form, patientId: patient.id });
                                      setPatientSearch(patient.name);
                                    }}
                                  >
                                    {patient.name} - {patient.cpf}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formErrors.patientId && <FieldError id="appointment-form-patientId-error" message={formErrors.patientId} />}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="space-y-2">
                    <Label htmlFor="appointment-form-items" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-emerald-600" />
                      Medicamentos *
                    </Label>
                    {form.items.map((item, index) => {
                      const medicine = medicines.find((entry) => entry.id === item.medicineId);
                      const available = medicine ? isMedicineAvailable(medicine, isPatient) : false;
                      return (
                        <div key={`${index}-${item.medicineId}`} className="grid grid-cols-[minmax(0,1fr)_80px_auto_auto] items-center gap-2">
                          <Select
                            value={item.medicineId ? String(item.medicineId) : ''}
                            onValueChange={(value) => {
                              setForm({
                                ...form,
                                items: form.items.map((entry, itemIndex) => itemIndex === index
                                  ? { ...entry, medicineId: Number(value) }
                                  : entry),
                              });
                              setFormErrors((current) => ({ ...current, items: undefined }));
                            }}
                          >
                            <SelectTrigger id={index === 0 ? 'appointment-form-items' : undefined} aria-invalid={!!formErrors.items} aria-describedby={formErrors.items ? 'appointment-form-items-error' : undefined} className="col-span-4 min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:col-span-1">
                              <SelectValue placeholder="Selecione o medicamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicines.map((entry) => (
                                <SelectItem key={entry.id} value={String(entry.id)} disabled={isPatient && !isMedicineAvailable(entry, true)}>
                                  {entry.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => setForm({
                              ...form,
                              items: form.items.map((entry, itemIndex) => itemIndex === index
                                ? { ...entry, quantity: Math.max(1, Number(event.target.value)) }
                                : entry),
                            })}
                            className="rounded-xl text-xs"
                            aria-label={`Quantidade do medicamento ${index + 1}`}
                          />
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap text-[10px] ${available ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'}`}
                          >
                            {isPatient
                              ? (available ? 'Disponível' : 'Indisponível')
                              : `Disponível Real: ${medicine ? getAvailableStock(medicine) : 0} un.`}
                          </Badge>
                          {form.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}
                              aria-label="Remover medicamento"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {formErrors.items && <FieldError id="appointment-form-items-error" message={formErrors.items} />}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForm({ ...form, items: [...form.items, { medicineId: 0, quantity: 1 }] })}
                      className="rounded-xl text-xs"
                    >
                      + Adicionar outro medicamento
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="appointment-form-scheduledDate" className="text-xs font-bold text-slate-600 dark:text-slate-300">Data *</Label>
                      <Input
                        id="appointment-form-scheduledDate"
                        type="date"
                        aria-invalid={!!formErrors.scheduledDate}
                        aria-describedby={formErrors.scheduledDate ? 'appointment-form-date-error' : undefined}
                        value={form.scheduledDate}
                        onChange={(event) => {
                          setForm({ ...form, scheduledDate: event.target.value, scheduledTime: '', slotId: undefined });
                          setFormErrors((current) => ({ ...current, scheduledDate: undefined, slotId: undefined }));
                        }}
                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                      />
                      {formErrors.scheduledDate && <FieldError id="appointment-form-date-error" message={formErrors.scheduledDate} />}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="appointment-form-slotId" className="text-xs font-bold text-slate-600 dark:text-slate-300">Horário da Escala *</Label>
                      <Select
                        value={form.slotId ? String(form.slotId) : ''}
                        onValueChange={(value) => {
                          const selectedSlot = availableSlotsForDate.find((slot) => slot.id === Number(value));
                          if (selectedSlot) {
                            setForm({ ...form, slotId: selectedSlot.id, scheduledTime: selectedSlot.timeSlot });
                          }
                        }}
                        disabled={!form.scheduledDate}
                      >
                        <SelectTrigger id="appointment-form-slotId" aria-invalid={!!formErrors.slotId} aria-describedby={formErrors.slotId ? 'appointment-form-slot-error' : undefined} className="w-full min-w-0 overflow-hidden text-left rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                          <SelectValue className="truncate" placeholder={form.scheduledDate ? 'Selecione um horário' : 'Escolha a data primeiro'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSlotsForDate.map((slot) => {
                            const booked = slot._count?.appointments ?? 0;
                            const free = Math.max(0, slot.maxCapacity - booked);
                            const pharmacist = formatProfessionalName(slot.assignedTo?.name);
                            return (
                              <SelectItem key={slot.id} value={String(slot.id)} disabled={free === 0}>
                                {slot.timeSlot} — ({free}/{slot.maxCapacity} vagas) — {pharmacist}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {formErrors.slotId && <FieldError id="appointment-form-slot-error" message={formErrors.slotId} />}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Observações</Label>
                    <Textarea
                      rows={2}
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="Informações adicionais..."
                      className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <DialogFooter className="pt-3">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                    >
                      Agendar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          );
        }
        return null;
      })()}
      {/* modal de cancelamento. exige justificativa e libera a reserva
          de estoque no backend. */}
      <Dialog open={cancelTarget !== null} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Cancelar agendamento</DialogTitle>
            <DialogDescription>A reserva de estoque será liberada. Informe a justificativa obrigatória.</DialogDescription>
          </DialogHeader>
          <Textarea id="appointment-cancel-reason" aria-label="Justificativa do cancelamento" value={cancelReason} aria-invalid={!!cancelReasonError} aria-describedby={cancelReasonError ? 'appointment-cancel-reason-error' : undefined} onChange={(event) => { setCancelReason(event.target.value); setCancelReasonError(''); }} placeholder="Justificativa do cancelamento" rows={4} />
          {cancelReasonError && <FieldError id="appointment-cancel-reason-error" message={cancelReasonError} />}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button type="button" variant="destructive" onClick={handleCancelAppointment}>Confirmar cancelamento</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={receipt !== null} onOpenChange={(open) => { if (!open) setReceipt(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Comprovante de Retirada</DialogTitle>
            <DialogDescription>Baixa FEFO concluída para este atendimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Paciente:</span> {receipt?.patient?.name ?? 'Não informado'}</p>
            <p>
              <span className="text-slate-500">Lote consumido:</span>{' '}
              {receipt?.batch?.batchNumber
                ?? receipt?.allocatedItems?.map((item) => item.batchNumber).join(', ')
                ?? receipt?.items?.map((item) => item.batch?.batchNumber).filter(Boolean).join(', ')
                ?? 'Baixa FEFO registrada'}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceipt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}