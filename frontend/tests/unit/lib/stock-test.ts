import { describe, expect, it } from 'vitest';
import { getRealAvailableQuantity, isMedicineAvailable } from '@/lib/stock';

describe('medicine stock helpers', () => {
  it('uses boolean availability for sanitized patient medicine payloads', () => {
    expect(isMedicineAvailable({ hasStock: true }, true)).toBe(true);
    expect(isMedicineAvailable({ available: true }, true)).toBe(true);
    expect(isMedicineAvailable({ hasStock: false }, true)).toBe(false);
  });

  it('uses boolean availability when quantity is omitted', () => {
    expect(isMedicineAvailable({ available: true })).toBe(true);
    expect(isMedicineAvailable({ totalQuantity: undefined, hasStock: false, available: true })).toBe(false);
  });

  it('calculates real available quantity for staff payloads', () => {
    expect(getRealAvailableQuantity({ totalQuantity: 12, reservedQuantity: 5 })).toBe(7);
    expect(isMedicineAvailable({ totalQuantity: 12, reservedQuantity: 12 })).toBe(false);
  });
});