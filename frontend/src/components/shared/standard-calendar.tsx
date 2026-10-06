'use client';

import dynamic from 'next/dynamic';
import type { EventClickArg, EventInput, DatesSetArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';

// carrega o fullcalendar de forma lazy com todos os plugins dentro
// do proprio dynamic import. o ponto importante e que daygrid,
// timegrid, interaction, list e o locale pt-br nao entram mais no
// bundle inicial de todas as paginas: eles so baixam quando um
// calendario monta (rotas /calendar e /scales).
// o ssr fica desligado porque o fullcalendar depende de dom.
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
      // cada modulo pode vir como default ou como named export,
      // dependendo da versao/bundler. a resolucao abaixo cobre os
      // dois casos.
      const FullCalendarInner = (reactMod as any).default ?? (reactMod as any);
      const plugins = [
        (dayGridMod as any).default ?? (dayGridMod as any),
        (timeGridMod as any).default ?? (timeGridMod as any),
        (interactionMod as any).default ?? (interactionMod as any),
        (listMod as any).default ?? (listMod as any),
      ];
      const locale = (localeMod as any).default ?? (localeMod as any);
      // wrapper que ja injeta plugins e locale, pra o consumidor
      // nao precisar saber disso.
      function LazyCalendar(props: Record<string, unknown>) {
        return <FullCalendarInner {...props} plugins={plugins} locale={locale} />;
      }
      return LazyCalendar;
    }),
  {
    ssr: false,
    // fallback de loading enquanto o chunk do calendario baixa.
    loading: () => (
      <div className="min-h-125 flex items-center justify-center text-slate-400 text-sm">
        Carregando calendário...
      </div>
    ),
  }
) as any;

// props do calendario padrao. os callbacks sao opcionais: cada tela
// usa os que fazem sentido (clique em dia, clique em evento, mudanca
// de periodo visivel).
interface StandardCalendarProps {
  events: EventInput[];
  onDateClick?: (_info: DateClickArg) => void;
  onEventClick?: (_info: EventClickArg) => void;
  onDatesSet?: (_info: DatesSetArg) => void;
  initialDate?: string;
}

// calendario padronizado do sistema. envolve o fullcalendar com uma
// configuracao ja fixada (views, textos em portugues, altura
// automatica, badge de "hoje"), pra nao precisar repetir tudo em
// cada tela que usa calendario.
export function StandardCalendar({ events, onDateClick, onEventClick, onDatesSet, initialDate }: StandardCalendarProps) {
  return (
    <FullCalendar
      initialView="dayGridMonth"
      initialDate={initialDate}
      timeZone="local"
      // toolbar com prev/next/hoje a esquerda, titulo no centro e
      // as views (mes, semana, lista) a direita.
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth',
      }}
      // textos em portugues pros botoes da toolbar.
      buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' }}
      events={events}
      dateClick={onDateClick}
      eventClick={onEventClick}
      datesSet={onDatesSet}
      height="auto"
      // limita a 3 eventos visiveis por dia, com "+n" pro resto.
      dayMaxEvents={3}
      moreLinkText={(count: number) => `+${count}`}
      // adiciona um badge "hoje" no canto do dia atual, sem
      // duplicar quando ja existe.
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