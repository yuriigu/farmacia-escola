'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Calendar, Plus, Check, X, Clock, Download, CircleCheckBig, Eye, Pill, User, FileText, Info, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchAllData } from '@/lib/pharmacy-store';
import type { Appointment, AppointmentDraft } from '@/lib/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS, downloadCSV, getAvatarColor } from '@/lib/constants';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
          const results = await api.getDoctorHistory(digits);
          setCpfSuggestions(results);
          setShowSuggestions(results.length > 0);
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

    setLoading(true);
    try {
      const dateVal = new Date(scheduledDate);
      const timeVal = dateVal.toTimeString().slice(0, 5);
      await api.createAppointment({
        items: [{ medicineId, quantity }],
        scheduledDate: dateVal.toISOString(),
        scheduledTime: timeVal,
        notes: notes || undefined,
        patientName: patientName.trim(),
        patientCpf: digits,
      });
      toast.success('Agendamento criado com sucesso!');
      cleanForm();
      onOpenChange(false);
      fetchAllData();
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao criar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cleanForm(); onOpenChange(v); }}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <User className="w-5 h-5" />
            </div>
            Novo Agendamento — Médico
          </DialogTitle>
          <DialogDescription>
            Cadastre um agendamento informando o CPF e nome do paciente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CPF do Paciente */}
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
                className="rounded-xl border-slate-200 dark:border-slate-600 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-10 font-mono"
                maxLength={14}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {searchingCpf ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {/* Autocomplete suggestions */}
            {showSuggestions && cpfSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-slide-down">
                <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80">
                  Sugestões do seu histórico
                </p>
                {cpfSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{formatCPF(s.cpf)}</p>
                    </div>
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
            <Button type="button" variant="outline" onClick={() => { cleanForm(); onOpenChange(false); }} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={loading} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
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
  const { appointments, medicines, patients } = usePharmacyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isMedico = user?.role === 'MEDICO';
  const defaultForm: AppointmentDraft = { items: [{ medicineId: 0, quantity: 1 }], scheduledDate: '', scheduledTime: '', patientId: undefined, notes: '' };
  const [form, setForm] = useState<AppointmentDraft>(defaultForm);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Listen for calendar day-click event to auto-open modal
  useEffect(() => {
    const handler = () => {
      if (isMedico) {
        setModalOpen(true);
      } else {
        setForm(defaultForm);
        setModalOpen(true);
      }
    };
    window.addEventListener('calendar:goToAppointments', handler);
    return () => window.removeEventListener('calendar:goToAppointments', handler);
  }, [isMedico]);

  useEffect(() => {
    if (isPatient || isMedico || !modalOpen) return;
    let active = true;
    setLoadingPatients(true);
    (async () => {
      try {
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

  // Determine which modal to show
  const openModal = () => {
    if (isMedico) {
      // Doctor modal is controlled separately via DoctorAppointmentModal
      return;
    }
    setForm(defaultForm);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />Atendimentos e Consultas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isMedico ? 'Agendamentos pelo médico' : isPatient ? 'Seus agendamentos farmacêuticos' : 'Agendamentos farmacêuticos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPatient && !isMedico && (
          <Button variant="outline" onClick={() => {
            const header = ['Medicamento', 'Dosagem', 'Paciente', 'CPF', 'Data Agendada', 'Status', 'Observações'];
            const rows = appointments.map((a) => {
              const scheduled = new Date(a.scheduledDate);
              const dateLabel = Number.isNaN(scheduled.getTime()) ? '-' : scheduled.toLocaleString('pt-BR');
              return [a.items?.[0]?.medicine?.name ?? '', a.items?.[0]?.medicine?.dosage ?? '', a.patient?.name ?? '', a.patient?.cpf ?? '', dateLabel, a.status, a.notes || ''];
            });
            downloadCSV('agendamentos_' + new Date().toISOString().slice(0, 10) + '.csv', [header, ...rows]);
            toast.success('Relatório exportado com sucesso!');
          }} disabled={appointments.length === 0} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4" />Exportar CSV
          </Button>
          )}
          {isMedico ? (
            <DoctorAppointmentModal open={modalOpen} onOpenChange={setModalOpen} />
          ) : null}
          <Button onClick={() => {
            if (isMedico) {
              setModalOpen(true);
            } else {
              openModal();
            }
          }} className="rounded-xl gap-2 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-900/10 flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-teal-400" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum agendamento cadastrado</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Crie o primeiro agendamento para começar.</p>
              <Button onClick={() => {
                if (isMedico) {
                  setModalOpen(true);
                } else {
                  setForm(defaultForm);
                  setModalOpen(true);
                }
              }} className="rounded-xl gap-2 text-xs">
                <Plus className="w-3.5 h-3.5" />Novo Agendamento
              </Button>
            </div>
          </div>
        ) : (
          appointments.map((app) => {
            const scheduled = new Date(app.scheduledDate);
            const dateLabel = Number.isNaN(scheduled.getTime()) ? '—' : scheduled.toLocaleDateString('pt-BR');
            const timeLabel = Number.isNaN(scheduled.getTime()) ? '—' : scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <Card key={app.id} className="space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => setSelectedAppointment(app)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={APPOINTMENT_STATUS_STYLES[app.status] || APPOINTMENT_STATUS_STYLES.PENDING}>
                      {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400 inline mr-0.5" />{timeLabel}
                      </span>
                      <Eye className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                      {app.items?.[0]?.medicine?.name ?? 'Medicamento não informado'}
                      {app.items?.[0]?.medicine?.dosage ? ` — ${app.items[0].medicine.dosage}` : ''}
                      {app.items && app.items.length > 1 && <span className="text-xs font-normal text-slate-400 ml-1">+{app.items.length - 1} item(ns)</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{app.patient?.name ?? 'Paciente não informado'}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{app.patient?.cpf ?? '—'}</span>
                    <span>{dateLabel}</span>
                  </div>
                  {/* Action buttons: Patient can cancel own; Doctor sees nothing; Others can confirm/cancel/complete */}
                  {app.status === 'PENDING' || app.status === 'CONFIRMED' ? (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {isPatient && (
                        <Button size="sm" variant="outline" onClick={async () => { try { await api.cancelAppointment(app.id); toast.success('Agendamento cancelado.'); fetchAllData(); } catch { toast.error('Erro ao cancelar.'); } }} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" title="Cancelar agendamento">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {!isPatient && !isMedico && (
                        <>
                        <Button size="sm" variant="outline" onClick={async () => { try { await api.completeAppointment(app.id); toast.success('Atendimento concluído!'); fetchAllData(); } catch { toast.error('Erro ao concluir atendimento.'); } }} className="rounded-xl h-8 w-8 p-0 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30" title="Concluir">
                          <CircleCheckBig className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => { try { await api.confirmAppointment(app.id); toast.success('Agendamento confirmado.'); fetchAllData(); } catch { toast.error('Erro ao confirmar.'); } }} disabled={app.status === 'CONFIRMED'} className="rounded-xl h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-40">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => { try { await api.cancelAppointment(app.id); toast.success('Agendamento cancelado.'); fetchAllData(); } catch { toast.error('Erro ao cancelar.'); } }} className="rounded-xl h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                          <X className="w-4 h-4" />
                        </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
                      {selectedAppointment.patient.cpf && <p className="text-xs text-slate-400 font-mono">{selectedAppointment.patient.cpf}</p>}
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
                      <p className="text-xs text-emerald-600 font-medium">Qtd: {item.quantity}</p>
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
                      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    })()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {(() => {
                      const d = new Date(selectedAppointment.scheduledDate);
                      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </p>
                </div>
              </div>

              {/* Created/Updated */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Criado em</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {selectedAppointment.createdAt ? new Date(selectedAppointment.createdAt).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atualizado em</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {selectedAppointment.updatedAt ? new Date(selectedAppointment.updatedAt).toLocaleString('pt-BR') : '—'}
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
                      {patients.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name} {p.cpf ? `— ${p.cpf}` : ''}</SelectItem>))}
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
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Agendar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
