import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { usePharmacy } from '@/lib/PharmacyContext';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function buildMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function AppointmentsOverview() {
  const navigate = useNavigate();
  const { appointments } = usePharmacy();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((app) => {
      if (app.status === 'cancelado') return;
      const parsed = new Date(app.date);
      if (Number.isNaN(parsed.getTime())) return;
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [appointments]);

  const days = useMemo(() => buildMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Agenda de Atendimentos
          </h1>
          <p className="text-sm text-slate-500">Selecione um dia para ver os detalhes das consultas</p>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-2 py-1.5">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-medium text-slate-800 text-sm min-w-[130px] text-center">
            {capitalizedMonth}
          </span>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 tracking-wide py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const key = `${viewYear}-${viewMonth + 1}-${d}`;
            const count = appointmentsByDay[key];
            const todayCell = isToday(d);

            return (
              <button
                key={i}
                onClick={() => navigate('/appointments')}
                className={`aspect-square rounded-xl p-2 flex flex-col items-start text-left transition-colors border ${
                  todayCell
                    ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <span className={`text-sm font-medium ${todayCell ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {d}
                </span>

                {count ? (
                  <span className="mt-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {count} {count === 1 ? 'consulta' : 'consultas'}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
