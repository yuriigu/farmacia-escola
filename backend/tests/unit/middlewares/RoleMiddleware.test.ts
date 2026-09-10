import { describe, expect, it } from 'vitest';
import { requirePermission } from '../../../src/middlewares/RoleMiddleware';

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
});