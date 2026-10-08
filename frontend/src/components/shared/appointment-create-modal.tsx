'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Pill, User, X } from 'lucide-react';
import { getRealAvailableQuantity, isMedicineAvailable } from '@/lib/stock';
import { dateKeyOffsetLocal } from '@/lib/dates';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import { QUERY_KEYS, useCreateAppointment, useMedicines, usePatients } from '@/services/queries';
import type { AppointmentItemDraft } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/field-error';

interface AppointmentCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMedicineId?: number;
  initialDate?: string;
  onSuccess?: () => void;
}

export function AppointmentCreateModal({
  open,
  onOpenChange,
  initialMedicineId,
  initialDate,
  onSuccess,
}: AppointmentCreateModalProps) {
  const user = useAuthStore((state) => state.user);
  const isPatient = user?.role === 'PACIENTE';
  const { data: medicines = [] } = useMedicines({ enabled: open });
  const { data: patients = [] } = usePatients(undefined, { enabled: open && !isPatient });
  const { scheduleSlots } = usePharmacyStore();
  const createAppointmentMutation = useCreateAppointment();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<AppointmentItemDraft[]>([{ medicineId: initialMedicineId ?? 0, quantity: 1 }]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>();
  const [patientSearch, setPatientSearch] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => initialDate ?? dateKeyOffsetLocal(1));
  const [slotId, setSlotId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ items?: string; appointmentDate?: string; slotId?: string; patient?: string }>({});

  useEffect(() => {
    if (open) void fetchScheduleSlotsData();
  }, [open]);

  const formItems = items.map((item, index) => {
    if (index === 0 && !item.medicineId && !initialMedicineId && medicines[0]) {
      return { ...item, medicineId: medicines[0].id };
    }
    return item;
  });

  const availableSlots = scheduleSlots.filter((slot) => slot.active && slot.date.slice(0, 10) === appointmentDate);
  const patientSuggestions = patients.filter((patient) => {
    const term = patientSearch.trim().toLowerCase();
    const cpf = patientSearch.replace(/\D/g, '');
    return term.length >= 2 && (patient.name.toLowerCase().includes(term) || patient.cpf.includes(cpf));
  }).slice(0, 6);
  const selectedSlot = scheduleSlots.find((slot) => slot.id === slotId);

  const realAvailable = (medicineId: number) => {
    const medicine = medicines.find((entry) => entry.id === medicineId);
    return medicine ? getRealAvailableQuantity(medicine) : 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (formItems.length === 0 || formItems.some((item) => !item.medicineId || item.quantity < 1)) {
      nextErrors.items = 'Selecione um medicamento e informe uma quantidade válida.';
    }
    if (!appointmentDate) {
      nextErrors.appointmentDate = 'Selecione uma data para o agendamento.';
    }
    if (!selectedSlot || !selectedSlot.active || selectedSlot.date.slice(0, 10) !== appointmentDate) {
      nextErrors.slotId = 'Selecione um horário disponível na escala.';
    } else {
      const booked = selectedSlot._count?.appointments ?? 0;
      if (Math.max(0, selectedSlot.maxCapacity - booked) === 0) {
        nextErrors.slotId = 'Este horário da escala está lotado.';
      }
    }
    if (!isPatient && !selectedPatientId) {
      nextErrors.patient = 'Selecione o paciente.';
    }

    const invalidStock = formItems.find((item) => {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      if (!medicine) return true;
      return isPatient
        ? !isMedicineAvailable(medicine, true)
        : item.quantity > getRealAvailableQuantity(medicine);
    });
    if (invalidStock) {
      nextErrors.items = isPatient
        ? 'Este medicamento não está disponível para agendamento no momento.'
        : 'A quantidade solicitada excede o estoque disponível real.';
    }
    setFieldErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      document.getElementById(`appointment-${firstInvalidField}`)?.focus();
      return;
    }
    if (!selectedSlot) return;

    createAppointmentMutation.mutate(
      {
        scheduledDate: appointmentDate,
        scheduledTime: selectedSlot.timeSlot,
        slotId: selectedSlot.id,
        patientId: isPatient ? undefined : selectedPatientId,
        notes: notes.trim() || undefined,
        items: formItems,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.medicines });
          void queryClient.invalidateQueries({ queryKey: ['batches'] });
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) setFieldErrors({});
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-125 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {initialMedicineId ? 'Agendar Retirada de Medicamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {isPatient
              ? 'Agende a data e o horário para retirar seu medicamento gratuito.'
              : 'Registre um novo agendamento de atendimento farmacêutico.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
          {!isPatient && (
            <div className="space-y-1.5">
              <Label htmlFor="appointment-patient" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Paciente *
              </Label>
              <div className="relative">
                <Input
                  id="appointment-patient"
                  aria-invalid={!!fieldErrors.patient}
                  aria-describedby={fieldErrors.patient ? 'appointment-patient-error' : undefined}
                  value={patientSearch || patients.find((patient) => patient.id === selectedPatientId)?.name || ''}
                  onChange={(event) => {
                    setPatientSearch(event.target.value);
                    setSelectedPatientId(undefined);
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
                          setSelectedPatientId(patient.id);
                          setPatientSearch(patient.name);
                        }}
                      >
                        {patient.name} - {patient.cpf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {fieldErrors.patient && <FieldError id="appointment-patient-error" message={fieldErrors.patient} />}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="appointment-items" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              Medicamentos *
            </Label>
            {formItems.map((item, index) => {
              const medicine = medicines.find((entry) => entry.id === item.medicineId);
              const available = medicine ? isMedicineAvailable(medicine, true) : false;
              return (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_76px_auto_32px] gap-2 items-center">
                  <Select
                    value={item.medicineId ? String(item.medicineId) : ''}
                    onValueChange={(value) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, medicineId: Number(value) } : entry))}
                  >
                    <SelectTrigger id={index === 0 ? 'appointment-items' : undefined} aria-invalid={!!fieldErrors.items} aria-describedby={fieldErrors.items ? 'appointment-items-error' : undefined} className="col-span-4 min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:col-span-1">
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
                    onChange={(event) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: Math.max(1, Number(event.target.value) || 1) } : entry))}
                    className="rounded-xl text-xs"
                    aria-label="Quantidade"
                  />
                  <Badge
                    variant="outline"
                    className={`whitespace-nowrap text-[10px] ${isPatient && !available ? 'text-rose-700 border-rose-200' : 'text-emerald-700 border-emerald-200'}`}
                  >
                    {isPatient ? (available ? 'Disponível' : 'Indisponível') : `Disponível Real: ${realAvailable(item.medicineId)} un.`}
                  </Badge>
                  {formItems.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label={`Remover ${medicine?.name ?? 'medicamento'}`}
                      title="Remover medicamento"
                      onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : <span aria-hidden="true" />}
                </div>
              );
            })}
            {fieldErrors.items && <FieldError id="appointment-items-error" message={fieldErrors.items} />}
            <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { medicineId: 0, quantity: 1 }])} className="rounded-xl text-xs">
              + Adicionar outro medicamento
            </Button>
          </div>

          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="appointment-appointmentDate" className="text-xs font-bold text-slate-600 dark:text-slate-300">Data *</Label>
              <Input
                id="appointment-appointmentDate"
                type="date"
                aria-invalid={!!fieldErrors.appointmentDate}
                aria-describedby={fieldErrors.appointmentDate ? 'appointment-date-error' : undefined}
                value={appointmentDate}
                onChange={(event) => {
                  setAppointmentDate(event.target.value);
                  setSlotId(undefined);
                }}
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
              />
              {fieldErrors.appointmentDate && <FieldError id="appointment-date-error" message={fieldErrors.appointmentDate} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appointment-slotId" className="text-xs font-bold text-slate-600 dark:text-slate-300">Horário da Escala *</Label>
              <Select value={slotId ? String(slotId) : ''} onValueChange={(value) => setSlotId(Number(value))} disabled={!appointmentDate}>
                <SelectTrigger id="appointment-slotId" aria-invalid={!!fieldErrors.slotId} aria-describedby={fieldErrors.slotId ? 'appointment-slot-error' : undefined} className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder={appointmentDate ? 'Selecione um horário' : 'Escolha a data primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => {
                    const booked = slot._count?.appointments ?? 0;
                    const free = Math.max(0, slot.maxCapacity - booked);
                    const pharmacist = slot.assignedTo?.name ?? 'Não informado';
                    return (
                      <SelectItem key={slot.id} value={String(slot.id)} disabled={free === 0}>
                        {slot.timeSlot} — ({free}/{slot.maxCapacity} vagas livres) — Farm. {pharmacist}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldErrors.slotId && <FieldError id="appointment-slot-error" message={fieldErrors.slotId} />}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Observações</Label>
            <Textarea
              rows={2}
              placeholder="Informações adicionais..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createAppointmentMutation.isPending}
              size="sm"
            >
              {createAppointmentMutation.isPending ? 'Salvando...' : 'Criar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}