import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/hooks/use-permission';
import { hasRouteAccess } from '@/config/rbac';

describe('permission contract', () => {
  it('allows patients to schedule and view their withdrawals without admin calendar access', () => {
    expect(hasPermission('APPOINTMENTS_CREATE', 'PACIENTE', null)).toBe(true);
    expect(hasPermission('MY_WITHDRAWALS_READ', 'PACIENTE', null)).toBe(true);
    expect(hasRouteAccess('PACIENTE', '/my-appointments')).toBe(true);
    expect(hasRouteAccess('PACIENTE', '/my-withdrawals')).toBe(true);
    expect(hasRouteAccess('PACIENTE', '/calendario')).toBe(false);
  });

  it('does not expose sensitive operational actions to patients', () => {
    expect(hasPermission('WITHDRAWALS_CANCEL', 'PACIENTE', null)).toBe(false);
    expect(hasPermission('DISPOSALS_REVERT', 'PACIENTE', null)).toBe(false);
    expect(hasPermission('SETTINGS_UPDATE', 'PACIENTE', null)).toBe(false);
  });
});