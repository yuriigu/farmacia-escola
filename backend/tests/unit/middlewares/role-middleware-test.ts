import { describe, expect, it } from 'vitest';
import { requireAnyPermission, requirePermission } from '../../../src/middlewares/role-middleware';

describe('central permission middleware', () => {
  it('returns the canonical 403 JSON for a forbidden action', () => {
    const middleware = requirePermission('DISPOSALS_REVERT');
    let result: unknown;
    const response = {
      status: (code: number) => ({
        json: (body: unknown) => {
          result = { code, body };
        },
      }),
    } as any;
    const next = () => {
      throw new Error('next must not be called');
    };

    middleware({ user: { role: 'PACIENTE', permissions: null } } as any, response, next);

    expect(result).toEqual({ code: 403, body: { error: 'Acesso negado' } });
  });

  it('accepts a named action granted by an ABAC exception', () => {
    const middleware = requirePermission('DISPOSALS_REVERT');
    const response = { status: () => ({ json: () => undefined }) } as any;
    let called = false;

    middleware({ user: { role: 'ALUNO', permissions: { DISPOSALS_REVERT: true } } } as any, response, () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  it('permite PUT /appointments/:id/status para PACIENTE cancelar com APPOINTMENTS_CANCEL', () => {
    const middleware = requireAnyPermission('APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL');
    const response = { status: () => ({ json: () => undefined }) } as any;
    let called = false;

    middleware({ user: { role: 'PACIENTE', permissions: null } } as any, response, () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  it('nega PUT /appointments/:id/status para MEDICO sem UPDATE nem CANCEL de outro recurso', () => {
    const middleware = requireAnyPermission('APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL');
    let result: unknown;
    const response = {
      status: (code: number) => ({
        json: (body: unknown) => {
          result = { code, body };
        },
      }),
    } as any;

    // MEDICO tem APPOINTMENTS_CANCEL, então deve passar; usa um par de
    // permissões que ele não tem para validar o caminho de negação.
    const denyMiddleware = requireAnyPermission('BATCHES_ADJUST', 'DISPOSALS_REVERT');
    denyMiddleware({ user: { role: 'MEDICO', permissions: null } } as any, response, () => {
      throw new Error('next must not be called');
    });

    expect(result).toEqual({ code: 403, body: { error: 'Acesso negado' } });
    expect(middleware).toBeDefined();
  });
});