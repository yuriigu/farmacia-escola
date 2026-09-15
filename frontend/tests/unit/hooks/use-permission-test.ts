import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/hooks/use-permission';
import { hasRouteAccess } from '@/config/rbac';

describe('permission contract', () => {
  it('allows patients to schedule and view calendar', () => {
    expect(hasPermission('APPOINTMENTS_CREATE', 'PACIENTE', null)).toBe(true);
    expect(hasRouteAccess('PACIENTE', '/calendario')).toBe(true);
  });

  it('does not expose sensitive operational actions to patients', () => {
    expect(hasPermission('DISPOSALS_REVERT', 'PACIENTE', null)).toBe(false);
    expect(hasPermission('SETTINGS_UPDATE', 'PACIENTE', null)).toBe(false);
  });
});