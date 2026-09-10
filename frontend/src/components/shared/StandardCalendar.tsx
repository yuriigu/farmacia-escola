'use client';

import dynamic from 'next/dynamic';
import type { EventClickArg, EventInput, DatesSetArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[500px] flex items-center justify-center text-slate-400 text-sm">
      Carregando calendário...
    </div>
  ),
}) as any;

interface StandardCalendarProps {
  events: EventInput[];
  onDateClick?: (info: DateClickArg) => void;
  onEventClick?: (info: EventClickArg) => void;
  onDatesSet?: (info: DatesSetArg) => void;
  initialDate?: string;
}

export function StandardCalendar({ events, onDateClick, onEventClick, onDatesSet, initialDate }: StandardCalendarProps) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      locale={ptBrLocale}
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