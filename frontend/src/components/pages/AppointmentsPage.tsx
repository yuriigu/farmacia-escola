'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Calendar, Plus, Check, X, Clock, Download, CircleCheckBig,
  Eye, Pill, User, FileText, Info, Search, CalendarDays
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchAllData } from '@/lib/pharmacy-store';
import type { Appointment, AppointmentDraft } from '@/lib/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS, downloadCSV, getAvatarColor } from '@/lib/constants';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';

// ==================== CPF MASK ====================
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function stripCPF(value: string): string {
  return value.replace(/\D/g, '');
}

// ==================== DOCTOR APPOINTMENT MODAL ====================
function DoctorAppointmentModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { medicines } = usePharmacyStore();
  const [cpfInput, setCpfInput] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medicineId, setMedicineId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [cpfSuggestions, setCpfSuggestions] = useState<Array<{ id: number; name: string; cpf: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCpf, setSearchingCpf] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const cleanForm = useCallback(() => {
    setCpfInput('');
    setPatientName('');
    setMedicineId(0);
    setQuantity(1);
    setScheduledDate('');
    setNotes('');
    setCpfSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // CPF autocomplete: search doctor's history
  const handleCpfChange = useCallback((value: string) => {
    const formatted = formatCPF(value);
    setCpfInput(formatted);
    const digits = stripCPF(formatted);

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

  const selectSuggestion = (suggestion: { name: string; cpf: string }) => {
    setCpfInput(formatCPF(suggestion.cpf));
    setPatientName(suggestion.name);
    setShowSuggestions(false);
    setCpfSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId || !scheduledDate) {
      toast.error('Preencha medicamento e data/horário.');
      return;
    }

    const digits = stripCPF(cpfInput);
    if (digits.length !== 11) {
      toast.error('CPF inválido. Informe um CPF completo com 11 dígitos.');
      return;
    }
    if (!patientName.trim()) {
      toast.error('Informe o nome do paciente.');
      return;
    }

    try {
      setLoading(true);
      const dateVal = new Date(scheduledDate);
      const timeVal = dateVal.toTimeString().slice(0, 5);

      await api.createAppointment({
        items: [{ medicineId, quantity }],
        patientName: patientName.trim(),
        patientCpf: digits,
        scheduledDate: dateVal.toISOString(),
        scheduledTime: timeVal,
        notes: notes.trim() || undefined,
      });

      toast.success('Agendamento médico realizado com sucesso!');
      cleanForm();
      onOpenChange(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao criar agendamento médico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* CPF with Autocomplete */}
          <div className="relative" ref={suggestionsRef}>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
              CPF do Paciente
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={cpfInput}
                onChange={(e) => handleCpfChange(e.target.value)}
                maxLength={14}
                className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
              {searchingCpf && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && cpfSuggestions.length > 0 && (
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
                    <span className="font-mono text-slate-400 text-[11px]">{formatCPF(s.cpf)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nome do Paciente */}
          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
              Nome do Paciente
            </Label>
            <Input
              type="text"
              placeholder="Nome completo do paciente"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Medicamento */}
          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
              Medicamento
            </Label>
            <Select value={medicineId ? String(medicineId) : ''} onValueChange={(v) => setMedicineId(Number(v))}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <SelectValue placeholder="Selecione um medicamento..." />
              </SelectTrigger>
              <SelectContent>
                {medicines.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}{m.dosage ? ` — ${m.dosage}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
              Quantidade
            </Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Data e Horário */}
          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
              Data e Horário (Slot)
            </Label>
            <Input
              type="datetime-local"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Observações */}
          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
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
            <Button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {loading ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== APPOINTMENTS PAGE ====================
export function AppointmentsPage() {
  const searchParams = useSearchParams();
  const initialNew = searchParams.get('new') === '1' || !!searchParams.get('medicineId');
  const initialMedId = searchParams.get('medicineId') ? Number(searchParams.get('medicineId')) : 0;

  const { appointments, medicines, patients, loading } = usePharmacyStore();
  const [modalOpen, setModalOpen] = useState(initialNew);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isMedico = user?.role === 'MEDICO';
  const defaultForm: AppointmentDraft = {
    items: [{ medicineId: initialMedId, quantity: 1 }],
    scheduledDate: '',
    scheduledTime: '',
    patientId: undefined,
    notes: '',
  };
  const [form, setForm] = useState<AppointmentDraft>(defaultForm);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Listen for calendar day-click event to auto-open modal
  useEffect(() => {
    const handler = () => {
      setModalOpen(true);
    };
    window.addEventListener('calendar:goToAppointments', handler);
    return () => window.removeEventListener('calendar:goToAppointments', handler);
  }, []);

  useEffect(() => {
    if (isPatient || isMedico || !modalOpen) return;
    let active = true;
    (async () => {
      try {
        setLoadingPatients(true);
        const data = await api.getPatients();
        if (active) usePharmacyStore.setState({ patients: data });
      } catch { /* ignore */ }
      finally { if (active) setLoadingPatients(false); }
    })();
    return () => { active = false; };
  }, [modalOpen, isPatient, isMedico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.items[0]?.medicineId || !form.scheduledDate) return;
    if (!isPatient && !isMedico && !form.patientId) return;
    try {
      const dateVal = new Date(form.scheduledDate);
      const timeVal = form.scheduledTime || dateVal.toTimeString().slice(0, 5);
      await api.createAppointment({
        items: form.items,
        scheduledDate: dateVal.toISOString(),
        scheduledTime: timeVal,
        notes: form.notes || undefined,
        ...(isPatient ? {} : { patientId: form.patientId }),
      });
      toast.success('Agendamento criado com sucesso!');
      setForm(defaultForm);
      setModalOpen(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao criar agendamento.');
    }
  };

  const handleExportCSV = () => {
    const header = ['Medicamento', 'Dosagem', 'Paciente', 'CPF', 'Data Agendada', 'Status', 'Observações'];
    const rows = filteredAppointments.map((a) => {
      const scheduled = new Date(a.scheduledDate);
      const dateLabel = Number.isNaN(scheduled.getTime()) ? '-' : scheduled.toLocaleString('pt-BR');
      return [
        a.items?.[0]?.medicine?.name ?? '',
        a.items?.[0]?.medicine?.dosage ?? '',
        a.patient?.name ?? '',
        a.patient?.cpf ?? '',
        dateLabel,
        a.status,
        a.notes || '',
      ];
    });
    downloadCSV('agendamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
    toast.success('Relatório exportado com sucesso!');
  };

  const filteredAppointments = appointments.filter((app) => {
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const patientMatch =
      (app.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.patient?.cpf || '').includes(searchTerm);
    const medMatch = (app.items || []).some(
      (i) =>
        (i.medicine?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.medicine?.dosage || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const notesMatch = (app.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && (patientMatch || medMatch || notesMatch);
  });

  // Standardized Table Columns
  const columns: Column<Appointment>[] = [
    {
      header: 'Data & Horário',
      width: '180px',
      cell: (app) => {
        const scheduled = new Date(app.scheduledDate);
        const dateStr = Number.isNaN(scheduled.getTime()) ? '—' : scheduled.toLocaleDateString('pt-BR');
        const timeStr = app.scheduledTime || (Number.isNaN(scheduled.getTime()) ? '' : scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight">
                {dateStr}
              </p>
              {timeStr && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {timeStr}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Paciente',
      width: '200px',
      cell: (app) => {
        const name = app.patient?.name || (isPatient ? user?.name : 'Não informado');
        const cpf = app.patient?.cpf ? formatCPF(app.patient.cpf) : null;
        return (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm line-clamp-1">
              {name}
            </p>
            {cpf && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{cpf}</p>}
          </div>
        );
      },
    },
    {
      header: 'Medicamento(s)',
      cell: (app) => {
        const firstItem = app.items?.[0];
        const medName = firstItem?.medicine?.name || 'Medicamento não especificado';
        const dosage = firstItem?.medicine?.dosage;
        const qty = firstItem?.quantity || 1;
        const totalItems = app.items?.length || 0;

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {medName} {dosage ? <span className="text-slate-400 text-xs">({dosage})</span> : null}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quantidade: <span className="font-semibold text-slate-700 dark:text-slate-300">{qty} un.</span>
                {totalItems > 1 && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    +{totalItems - 1} outro(s)
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (app) => (
        <Badge
          variant="outline"
          className={`font-semibold text-[11px] ${APPOINTMENT_STATUS_STYLES[app.status] || APPOINTMENT_STATUS_STYLES.PENDING}`}
        >
          {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      align: 'right',
      width: '140px',
      cell: (app) => {
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

            {/* Patient cancel action */}
            {isPatient && (app.status === 'PENDING' || app.status === 'CONFIRMED') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await api.cancelAppointment(app.id);
                    toast.success('Agendamento cancelado.');
                    fetchAllData();
                  } catch {
                    toast.error('Erro ao cancelar.');
                  }
                }}
                className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                title="Cancelar agendamento"
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Staff actions */}
            {!isPatient && !isMedico && (app.status === 'PENDING' || app.status === 'CONFIRMED') && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await api.completeAppointment(app.id);
                      toast.success('Atendimento concluído!');
                      fetchAllData();
                    } catch {
                      toast.error('Erro ao concluir atendimento.');
                    }
                  }}
                  className="h-8 w-8 p-0 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                  title="Concluir Atendimento"
                >
                  <CircleCheckBig className="w-4 h-4" />
                </Button>

                {app.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await api.confirmAppointment(app.id);
                        toast.success('Agendamento confirmado.');
                        fetchAllData();
                      } catch {
                        toast.error('Erro ao confirmar.');
                      }
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    title="Confirmar Agendamento"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await api.cancelAppointment(app.id);
                      toast.success('Agendamento cancelado.');
                      fetchAllData();
                    } catch {
                      toast.error('Erro ao cancelar.');
                    }
                  }}
                  className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  title="Cancelar Agendamento"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Agendamentos de Retirada"
        description={
          isMedico
            ? 'Agendamentos e prescrições médicas de retirada'
            : isPatient
            ? 'Acompanhe as datas e horários dos seus atendimentos agendados'
            : 'Controle de agendamentos e consultas farmacêuticas da Farmácia Escola'
        }
        icon={Calendar}
        actions={
          <>
            {!isPatient && !isMedico && (
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredAppointments.length === 0}
                className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </Button>
            )}
            {isMedico ? (
              <DoctorAppointmentModal open={modalOpen} onOpenChange={setModalOpen} />
            ) : null}
            <Button
              onClick={() => {
                if (isMedico) {
                  setModalOpen(true);
                } else {
                  setForm(defaultForm);
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
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'COMPLETED', label: 'Concluídos' },
            { id: 'CANCELLED', label: 'Cancelados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Standardized DataTable */}
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

      {/* Appointment Detail Dialog */}
      <Dialog open={Boolean(selectedAppointment)} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600">
                <Calendar className="w-5 h-5" />
              </div>
              Detalhes do Atendimento
            </DialogTitle>
            <DialogDescription>Informações completas do agendamento</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={APPOINTMENT_STATUS_STYLES[selectedAppointment.status] || ''}>
                  {APPOINTMENT_STATUS_LABELS[selectedAppointment.status] || selectedAppointment.status}
                </Badge>
              </div>

              {/* Patient info */}
              {selectedAppointment.patient && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedAppointment.patient.name)} text-white flex items-center justify-center font-bold`}>
                      {selectedAppointment.patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedAppointment.patient.name}</p>
                      {selectedAppointment.patient.cpf && <p className="text-xs text-slate-400 font-mono">{formatCPF(selectedAppointment.patient.cpf)}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Medicine info */}
              {selectedAppointment.items && selectedAppointment.items.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Pill className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Medicamento(s)</p>
                  </div>
                  {selectedAppointment.items.map((item, idx) => (
                    <div key={item.id || idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-800' : ''}>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.medicine?.name ?? 'Medicamento não informado'}</p>
                      {item.medicine?.dosage && <p className="text-xs text-slate-400">Dosagem: {item.medicine.dosage}</p>}
                      {item.medicine?.activeIngredient && <p className="text-xs text-slate-400">Princípio Ativo: {item.medicine.activeIngredient}</p>}
                      <p className="text-xs text-emerald-600 font-medium">Quantidade: {item.quantity} un.</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Agendada</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {(() => {
                      const d = new Date(selectedAppointment.scheduledDate);
                      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    })()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAppointment.scheduledTime || (() => {
                      const d = new Date(selectedAppointment.scheduledDate);
                      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Observações</p>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Standard Appointment Modal (non-doctor) */}
      {!isMedico && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Cadastre uma nova consulta ou atendimento.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Medicamento</Label>
                <Select value={form.items[0]?.medicineId ? String(form.items[0].medicineId) : ''} onValueChange={(v) => setForm({ ...form, items: [{ ...form.items[0], medicineId: Number(v) }] })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"><SelectValue placeholder="Selecione um medicamento..." /></SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.name}{m.dosage ? ` — ${m.dosage}` : ''}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Quantidade</Label>
                <Input type="number" min={1} value={form.items[0]?.quantity ?? 1} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], quantity: Math.max(1, Number(e.target.value)) }] })} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              {!isPatient && (
                <div>
                  <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Paciente</Label>
                  <Select value={form.patientId ? String(form.patientId) : ''} onValueChange={(v) => setForm({ ...form, patientId: Number(v) })}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" disabled={loadingPatients}>
                      <SelectValue placeholder={loadingPatients ? 'Carregando...' : 'Selecione um paciente...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name} {p.cpf ? `— ${formatCPF(p.cpf)}` : ''}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Data e Horário</Label>
                <Input type="datetime-local" required value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">Observações (opcional)</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Orientações..." className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Agendar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}