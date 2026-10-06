export function toDateKey(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : '';
}

export function dateKeyOffsetLocal(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKeyLocal(): string {
  return dateKeyOffsetLocal(0);
}

export function formatDateKeyBr(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('pt-BR', options);
}

export function isoFromLocalDateTime(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}