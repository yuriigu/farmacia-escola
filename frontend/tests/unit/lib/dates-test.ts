import { describe, expect, it } from 'vitest';
import { dateKeyOffsetLocal, formatDateKeyBr, isoFromLocalDateTime, todayKeyLocal, toDateKey } from '@/lib/dates';

describe('date helpers', () => {
  it('preserves the date portion of an ISO timestamp', () => {
    expect(toDateKey('2026-10-05T00:00:00.000Z')).toBe('2026-10-05');
  });

  it('formats a date key without moving it to the previous UTC day', () => {
    expect(formatDateKeyBr('2026-10-05')).toBe('05/10/2026');
  });

  it('serializes local date and time fields without changing their calendar day', () => {
    expect(isoFromLocalDateTime('2026-10-05', '08:30')).toBe('2026-10-05T08:30:00.000Z');
  });

  it('returns today using the local calendar date', () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(todayKeyLocal()).toBe(expected);
  });

  it('computes offset days using local calendar arithmetic', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    expect(dateKeyOffsetLocal(1)).toBe(expected);
  });
});