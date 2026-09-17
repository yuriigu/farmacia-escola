'use client';

import dynamic from 'next/dynamic';
import type { EventClickArg, EventInput, DatesSetArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';

// OTIMIZADO: plugins do FullCalendar movidos para DENTRO do dynamic import.
// Antes, dayGrid/timeGrid/interaction/list + locale pt-BR entravam no bundle
// inicial de TODAS as páginas (import estático); agora só baixam quando um
// calendário monta (rotas /calendar e /scales).
const FullCalendar = dynamic(
  () =>
    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/interaction'),
      import('@fullcalendar/list'),
      import('@fullcalendar/core/locales/pt-br'),
    ]).then(([reactMod, dayGridMod, timeGridMod, interactionMod, listMod, localeMod]) => {
      const FullCalendarInner = (reactMod as any).default ?? (reactMod as any);
      const plugins = [
        (dayGridMod as any).default ?? (dayGridMod as any),
        (timeGridMod as any).default ?? (timeGridMod as any),
        (interactionMod as any).default ?? (interactionMod as any),
        (listMod as any).default ?? (listMod as any),
      ];
      const locale = (localeMod as any).default ?? (localeMod as any);
      function LazyCalendar(props: Record<string, unknown>) {
        return <FullCalendarInner {...props} plugins={plugins} locale={locale} />;
      }
      return LazyCalendar;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-125 flex items-center justify-center text-slate-400 text-sm">
        Carregando calendário...
      </div>
    ),
  }
) as any;

interface StandardCalendarProps {
  events: EventInput[];
  onDateClick?: (_info: DateClickArg) => void;
  onEventClick?: (_info: EventClickArg) => void;
  onDatesSet?: (_info: DatesSetArg) => void;
  initialDate?: string;
}

export function StandardCalendar({ events, onDateClick, onEventClick, onDatesSet, initialDate }: StandardCalendarProps) {
  return (
    <FullCalendar
      initialView="dayGridMonth"
      initialDate={initialDate}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth',
      }}
      buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' }}
      events={events}
      dateClick={onDateClick}
      eventClick={onEventClick}
      datesSet={onDatesSet}
      height="auto"
      dayMaxEvents={3}
      moreLinkText={(count: number) => `+${count}`}
      dayCellDidMount={(info: { isToday: boolean; el: HTMLElement }) => {
        if (info.isToday && !info.el.querySelector('.fc-today-badge')) {
          const badge = document.createElement('span');
          badge.className = 'fc-today-badge';
          badge.textContent = 'Hoje';
          info.el.querySelector('.fc-daygrid-day-top')?.appendChild(badge);
        }
      }}
      className="standard-calendar"
    />
  );
}