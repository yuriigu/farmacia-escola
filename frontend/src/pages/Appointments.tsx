import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Plus, Check, X } from 'lucide-react';
import { usePharmacy, AppointmentDraft } from '@/lib/PharmacyContext';
import { Modal, fieldClass, labelClass } from '@/components/Modal';

const EMPTY_FORM: AppointmentDraft = {
  patientName: '',
  date: '',
  time: '',
  pharmacist: '',
  type: '',
};

const statusStyles: Record<string, string> = {
  confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  concluido: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelado: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function Appointments() {
  const { appointments, confirmAppointment, cancelAppointment, addAppointment } = usePharmacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AppointmentDraft>(EMPTY_FORM);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addAppointment(form);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            Atendimentos e Consultas
          </h1>
          <p className="text-sm text-slate-500">Agendamentos farmacêuticos e atenção à saúde do paciente</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {appointments.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
            Nenhum agendamento cadastrado.
          </div>
        )}
        {appointments.map((app) => (
          <div key={app.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase ${statusStyles[app.status] ?? statusStyles.pendente}`}>
                {app.status}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {app.time}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-base">{app.patientName}</h3>
              <p className="text-xs text-slate-500">{app.type}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {app.pharmacist}
              </span>
              <span>{app.date}</span>
            </div>

            {(app.status === 'pendente' || app.status === 'confirmado') && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => confirmAppointment(app.id)}
                  disabled={app.status === 'confirmado'}
                  title="Confirmar"
                  className={`p-2 rounded-xl transition-colors ${
                    app.status === 'confirmado'
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => cancelAppointment(app.id)}
                  title="Cancelar"
                  className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Agendamento"
        description="Cadastre uma nova consulta ou atendimento farmacêutico."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Paciente</label>
            <input
              required
              className={fieldClass}
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              placeholder="Nome do paciente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data</label>
              <input
                required
                type="date"
                className={fieldClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Horário</label>
              <input
                required
                type="time"
                className={fieldClass}
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Farmacêutico Responsável</label>
            <input
              required
              className={fieldClass}
              value={form.pharmacist}
              onChange={(e) => setForm({ ...form, pharmacist: e.target.value })}
              placeholder="Dra. Patricia"
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de Atendimento</label>
            <input
              required
              className={fieldClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="Orientação Farmacêutica"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Agendar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
