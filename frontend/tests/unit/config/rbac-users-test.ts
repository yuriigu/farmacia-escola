import { describe, expect, it } from 'vitest';
import {
  hasRouteAccess,
  getAssignableRoles,
  canCreateUser,
  canEditUser,
  canDeleteUser,
} from '@/config/rbac';

describe('user management RBAC contract', () => {
  it('mapeia a rota canonica /users para o modulo users (A5)', () => {
    expect(hasRouteAccess('ADMIN', '/users')).toBe(true);
    expect(hasRouteAccess('FARMACEUTICO', '/users')).toBe(true);
    expect(hasRouteAccess('ALUNO', '/users')).toBe(true);
    expect(hasRouteAccess('MEDICO', '/users')).toBe(true);
    expect(hasRouteAccess('PACIENTE', '/users')).toBe(false);
  });

  it('mantem os apelidos em portugues funcionando', () => {
    expect(hasRouteAccess('ADMIN', '/usuarios')).toBe(true);
    expect(hasRouteAccess('ADMIN', '/administracao')).toBe(true);
    expect(hasRouteAccess('ADMIN', '/pacientes')).toBe(true);
  });

  it('concede ao ADMIN todos os perfis atribuiveis', () => {
    expect(getAssignableRoles('ADMIN')).toEqual([
      'ADMIN',
      'FARMACEUTICO',
      'MEDICO',
      'ALUNO',
      'PACIENTE',
    ]);
  });

  it('restringe FARMACEUTICO/MEDICO/ALUNO exclusivamente a PACIENTE', () => {
    for (const staff of ['FARMACEUTICO', 'MEDICO', 'ALUNO']) {
      expect(getAssignableRoles(staff)).toEqual(['PACIENTE']);
      expect(canCreateUser(staff, 'PACIENTE')).toBe(true);
      expect(canEditUser(staff, 'PACIENTE')).toBe(true);
      expect(canCreateUser(staff, 'ADMIN')).toBe(false);
      expect(canCreateUser(staff, 'FARMACEUTICO')).toBe(false);
      expect(canEditUser(staff, 'FARMACEUTICO')).toBe(false);
      expect(canEditUser(staff, 'MEDICO')).toBe(false);
      expect(canEditUser(staff, 'ALUNO')).toBe(false);
    }
  });

  it('nunca permite que pacientes gerenciem usuarios', () => {
    expect(getAssignableRoles('PACIENTE')).toEqual([]);
    expect(canCreateUser('PACIENTE', 'PACIENTE')).toBe(false);
    expect(canEditUser('PACIENTE', 'PACIENTE')).toBe(false);
    expect(canDeleteUser('PACIENTE')).toBe(false);
  });

  it('permite excluir usuarios somente para ADMIN', () => {
    expect(canDeleteUser('ADMIN')).toBe(true);
    expect(canDeleteUser('FARMACEUTICO')).toBe(false);
    expect(canDeleteUser('MEDICO')).toBe(false);
    expect(canDeleteUser('ALUNO')).toBe(false);
    expect(canDeleteUser(null)).toBe(false);
    expect(canDeleteUser(undefined)).toBe(false);
  });

  it('permite ao ADMIN gerenciar qualquer perfil', () => {
    const allRoles = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];
    for (const role of allRoles) {
      expect(canCreateUser('ADMIN', role)).toBe(true);
      expect(canEditUser('ADMIN', role)).toBe(true);
    }
  });

  it('faz fail-closed para atores/rotas desconhecidos', () => {
    expect(getAssignableRoles('XPTO')).toEqual([]);
    expect(canCreateUser(null, 'PACIENTE')).toBe(false);
    expect(canEditUser('ADMIN', null)).toBe(false);
  });
});
