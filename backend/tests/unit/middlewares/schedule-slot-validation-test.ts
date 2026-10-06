import { describe, expect, it } from 'vitest';
import { scheduleSlotUpdateSchema } from '../../../src/middlewares/validation-middleware';

describe('scheduleSlotUpdateSchema', () => {
  it('accepts active while keeping unknown fields rejected', () => {
    expect(scheduleSlotUpdateSchema.safeParse({ active: true }).success).toBe(true);
    expect(scheduleSlotUpdateSchema.safeParse({ active: true, unexpected: true }).success).toBe(false);
  });

  it('accepts a null responsible pharmacist to unlink the slot', () => {
    expect(scheduleSlotUpdateSchema.safeParse({ assignedToId: null }).success).toBe(true);
  });
});