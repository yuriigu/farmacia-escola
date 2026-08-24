'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar, ArrowLeft, Plus, Trash2, Clock, CheckCircle2,
  AlertCircle, Pill, ShieldAlert, Sparkles, FileText
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMedicines, useCreateAppointment, useScheduleSlots } from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const appointmentSchema = z.object({
  scheduledDate: z.string().min(1, 'Selecione uma data para o agendamento'),
  scheduledTime: z.string().optional(),
  slotId: z.number().optional(),
  patientName: z.string().optional(),
  patientCpf: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        medicineId: z.number({ required_error: 'Selecione um medicamento' }).min(1, 'Selecione um medicamento'),
        quantity: z.number({ required_error: 'Quantidade inválida' }).min(1, 'Mínimo de 1 unidade'),
      })
    )
    .min(1, 'Adicione pelo menos um medicamento ao agendamento'),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMedId = searchParams.get('medicineId') ? Number(searchParams.get('medicineId')) : undefined;

  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';

  const { data: medicines = [], isLoading: loadingMeds } = useMedicines();
  const { data: scheduleSlots = [] } = useScheduleSlots();
  const createAppointmentMutation = useCreateAppointment();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      scheduledTime: '09:00',
      patientName: user?.name || '',
      patientCpf: '',
      notes: '',
      items: initialMedId ? [{ medicineId: initialMedId, quantity: 1 }] : [{ medicineId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    if (initialMedId && medicines.length > 0) {
      setValue('items.0.medicineId', initialMedId);
    }
  }, [initialMedId, medicines, setValue]);

  const onSubmit = (data: AppointmentFormData) => {
    // Filter out invalid items
    const validItems = data.items.filter((item) => item.medicineId > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      return;
    }

    createAppointmentMutation.mutate(
      {
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime || '09:00',
        slotId: data.slotId || undefined,
        patientId: user?.patientId || undefined,
        patientName: !isPatient ? data.patientName : user?.name,
        patientCpf: !isPatient ? data.patientCpf : undefined,
        notes: data.notes,
        items: validItems,
      },
      {
        onSuccess: () => {
          router.push('/appointments');
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      {/* Back link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl gap-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full w-fit mb-2 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Agendamento Farmacêutico
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Novo Agendamento de Retirada</h1>
          <p className="text-emerald-100 text-sm mt-1">
            Selecione os medicamentos necessários e escolha o dia e horário para comparecer à Farmácia Escola.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Info (if staff scheduling for a patient) */}
            {!isPatient && (
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Dados do Paciente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="patientName" className="text-xs font-bold uppercase text-slate-500">
                      Nome do Paciente *
                    </Label>
                    <Input
                      id="patientName"
                      placeholder="Nome completo"
                      {...register('patientName')}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="patientCpf" className="text-xs font-bold uppercase text-slate-500">
                      CPF do Paciente
                    </Label>
                    <Input
                      id="patientCpf"
                      placeholder="000.000.000-00"
                      {...register('patientCpf')}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Date & Time Selection */}
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Data e Horário do Atendimento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledDate" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Data Desejada *
                  </Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('scheduledDate')}
                    className="rounded-xl h-11"
                  />
                  {errors.scheduledDate && (
                    <p className="text-xs text-rose-500 font-medium">{errors.scheduledDate.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="scheduledTime" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Horário Sugerido
                  </Label>
                  <select
                    id="scheduledTime"
                    {...register('scheduledTime')}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="08:00">08:00 - 08:30</option>
                    <option value="08:30">08:30 - 09:00</option>
                    <option value="09:00">09:00 - 09:30</option>
                    <option value="09:30">09:30 - 10:00</option>
                    <option value="10:00">10:00 - 10:30</option>
                    <option value="10:30">10:30 - 11:00</option>
                    <option value="11:00">11:00 - 11:30</option>
                    <option value="13:30">13:30 - 14:00</option>
                    <option value="14:00">14:00 - 14:30</option>
                    <option value="14:30">14:30 - 15:00</option>
                    <option value="15:00">15:00 - 15:30</option>
                    <option value="15:30">15:30 - 16:00</option>
                    <option value="16:00">16:00 - 16:30</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medicines List */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  Medicamentos Solicitados
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ medicineId: 0, quantity: 1 })}
                  className="rounded-xl text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar outro
                </Button>
              </div>

              {errors.items && (
                <p className="text-xs text-rose-500 font-medium">{errors.items.message}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="flex-1 w-full sm:w-auto space-y-1">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">
                        Medicamento #{index + 1}
                      </Label>
                      <select
                        {...register(`items.${index}.medicineId` as const, { valueAsNumber: true })}
                        className="w-full h-11 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value={0}>Selecione um medicamento...</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id} disabled={(m.totalQuantity ?? 0) <= 0}>
                            {m.name} {m.dosage ? `(${m.dosage})` : ''} -{' '}
                            {(m.totalQuantity ?? 0) > 0 ? `${m.totalQuantity} em estoque` : 'Sem estoque'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28 space-y-1">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">
                        Qtd.
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                        className="h-11 rounded-xl bg-white dark:bg-slate-800"
                      />
                    </div>

                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2.5 mt-5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes / Clinical Info */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Observações ou Número da Receita (Opcional)
              </Label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Ex: Receita médica nº 12345, prescrita pelo Dr. Silva."
                {...register('notes')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="rounded-xl px-5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="rounded-xl px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md shadow-emerald-600/20"
              >
                {createAppointmentMutation.isPending ? 'Confirmando...' : 'Confirmar Agendamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <AppShell activeModuleId={'appointments' as any} pageTitle="Novo Agendamento">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando...</div>}>
        <NewAppointmentForm />
      </Suspense>
    </AppShell>
  );
}
