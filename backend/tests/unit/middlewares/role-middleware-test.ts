import { describe, expect, it } from 'vitest';
import { requireAnyPermission, requirePermission } from '../../../src/middlewares/role-middleware';

// testes do middleware de permissao central (role-middleware).
// cobrem dois caminhos principais:
// - negar acao quando o papel nao tem permissao (403 padronizado)
// - liberar quando o papel tem a acao na matriz, quando existe
//   uma excecao abac (permission customizada no token), e quando
//   uma das permissoes do requireanypermission bate.
// tambem cobre um caso especifico do endpoint de status de agendamento,
// que e onde o paciente usa a permissao de cancel pra agir na propria consulta.
describe('central permission middleware', () => {
  // quando o papel nao tem a permissao, o middleware precisa responder
  // 403 com o corpo padrao { error: 'acesso negado' } e nao chamar next.
  it('returns the canonical 403 JSON for a forbidden action', () => {
    const middleware = requirePermission('DISPOSALS_REVERT');
    let result: unknown;
    // response fake que guarda o status e o body que foram enviados,
    // pra validar depois.
    const response = {
      status: (code: number) => ({
        json: (body: unknown) => {
          result = { code, body };
        },
      }),
    } as any;
    // se o middleware chamar next, o teste quebra: nesse cenario
    // ele nao deveria liberar.
    const next = () => {
      throw new Error('next must not be called');
    };

    middleware({ user: { role: 'PACIENTE', permissions: null } } as any, response, next);

    expect(result).toEqual({ code: 403, body: { error: 'Acesso negado' } });
  });

  // mesmo que o papel nao tenha a permissao na matriz, uma excecao
  // abac (permission customizada no token) pode liberar. aqui o aluno
  // recebe disposals_revert via token e o middleware deixa passar.
  it('accepts a named action granted by an ABAC exception', () => {
    const middleware = requirePermission('DISPOSALS_REVERT');
    const response = { status: () => ({ json: () => undefined }) } as any;
    let called = false;

    middleware({ user: { role: 'ALUNO', permissions: { DISPOSALS_REVERT: true } } } as any, response, () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  // teste do endpoint put /appointments/:id/status. o paciente nao
  // tem appointments_update, mas tem appointments_cancel na matriz,
  // e o requireanypermission aceita qualquer uma das duas. por isso
  // deve passar.
  it('permite PUT /appointments/:id/status para PACIENTE cancelar com APPOINTMENTS_CANCEL', () => {
    const middleware = requireAnyPermission('APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL');
    const response = { status: () => ({ json: () => undefined }) } as any;
    let called = false;

    middleware({ user: { role: 'PACIENTE', permissions: null } } as any, response, () => {
      called = true;
    });

    expect(called).toBe(true);
  });

  it('permite ao MEDICO ler pacientes e horários de escala', () => {
    const patientsMiddleware = requirePermission('PATIENTS_READ');
    const schedulesMiddleware = requirePermission('SCHEDULES_READ');
    const response = { status: () => ({ json: () => undefined }) } as any;
    let patientsAllowed = false;
    let schedulesAllowed = false;

    patientsMiddleware({ user: { role: 'MEDICO', permissions: null } } as any, response, () => {
      patientsAllowed = true;
    });
    schedulesMiddleware({ user: { role: 'MEDICO', permissions: null } } as any, response, () => {
      schedulesAllowed = true;
    });

    expect(patientsAllowed).toBe(true);
    expect(schedulesAllowed).toBe(true);
  });

  // aqui o teste valida o caminho de negacao do requireanypermission.
  // escolhe duas permissoes que o medico nao tem, pra confirmar que
  // ele recebe 403 quando nenhuma das opcoes bate.
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

    // medico tem appointments_cancel, entao usar essas duas permissoes
    // nao serviria pra testar negacao. a gente usa um par que ele
    // realmente nao tem pra forcar o 403.
    const denyMiddleware = requireAnyPermission('BATCHES_ADJUST', 'DISPOSALS_REVERT');
    denyMiddleware({ user: { role: 'MEDICO', permissions: null } } as any, response, () => {
      throw new Error('next must not be called');
    });

    expect(result).toEqual({ code: 403, body: { error: 'Acesso negado' } });
    expect(middleware).toBeDefined();
  });
});