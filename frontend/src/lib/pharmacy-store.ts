'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from './api';
import type { Medicine, Disposal, Appointment, Batch, Patient, ScheduleSlot } from '@/types';
import { useAuthStore } from './auth-store';

// interface do estado da "farmacia" no client. guarda em memoria
// os dados que varias telas consomem (catalogo, lotes, descartes,
// agendamentos, pacientes e escala). o loading indica se o
// carregamento inicial ainda esta em andamento.
interface PharmacyState {
  medicines: Medicine[];
  batches: Batch[];
  disposals: Disposal[];
  appointments: Appointment[];
  patients: Patient[];
  scheduleSlots: ScheduleSlot[];
  loading: boolean;
}

// store zustand que centraliza o cache em memoria dos dados.
// comeca com listas vazias e loading true, pra o appshell poder
// mostrar o estado de carregando ate o primeiro fetch terminar.
export const usePharmacyStore = create<PharmacyState>(() => ({
  medicines: [],
  batches: [],
  disposals: [],
  appointments: [],
  patients: [],
  scheduleSlots: [],
  loading: true,
}));

// carrega todos os dados que o app costuma usar no boot. dispara
// as requisicoes em paralelo e vai populando a store conforme
// cada uma resolve. se uma falhar, so ignora (o resto continua).
// o loading vira false depois de 500ms, dando tempo pras chamadas
// resolverem antes do appshell sair do "carregando".
export function fetchAllData() {
  usePharmacyStore.setState({ loading: true });
  api.getMedicines().then((medicines) => usePharmacyStore.setState({ medicines })).catch(() => {});
  api.getAppointments().then((appointments) => usePharmacyStore.setState({ appointments })).catch(() => {});
  api.getPatients().then((patients) => usePharmacyStore.setState({ patients })).catch(() => {});
  api.getScheduleSlots().then((scheduleSlots) => usePharmacyStore.setState({ scheduleSlots })).catch(() => {});
  // descartes sao restritos a admin/farmaceutico/aluno; nao pra
  // paciente/medico. evita chamada que retornaria 403 e dispararia
  // toast de "sem permissao".
  try {
    const currentUser = useAuthStore.getState().user;
    const role = currentUser?.role?.toUpperCase();
    if (role && role !== 'PACIENTE' && role !== 'MEDICO') {
      api.getDisposals().then((disposals) => usePharmacyStore.setState({ disposals })).catch(() => {});
    }
  } catch {
    // se nao conseguir ler o usuario, so pula a chamada de descartes.
  }
  // marca loading como false depois de um pequeno delay pra dar
  // tempo das chamadas resolverem. e uma heuristica simples, sem
  // esperar o promise.all.
  setTimeout(() => usePharmacyStore.setState({ loading: false }), 500);
}

// recarrega so a lista de lotes. e chamada por telas que mexem em
// estoque (batch, inventario) depois de criar/editar/ajustar, pra
// refletir o saldo atualizado sem recarregar tudo.
export function fetchBatchesData(): Promise<void> {
  return api.getBatches()
    .then((batches) => usePharmacyStore.setState({ batches }))
    .catch(() => {});
}

// recarrega a lista de slots de escala, com filtro opcional de
// periodo. e usada pela tela de escala e pelos modais que precisam
// listar horarios disponiveis.
export function fetchScheduleSlotsData(params?: { startDate?: string; endDate?: string }): Promise<void> {
  return api.getScheduleSlots(params)
    .then((scheduleSlots) => usePharmacyStore.setState({ scheduleSlots }))
    .catch(() => {});
}

// hook que dispara o fetchall automaticamente quando o usuario
// esta autenticado. o parametro authenticated serve pra nao
// carregar antes da hidratacao do token. mudou de autenticado pra
// nao autenticado, o efeito nao faz nada (nada a carregar sem sessao).
export function useDataLoader(authenticated: boolean) {
  useEffect(() => {
    if (authenticated) {
      fetchAllData();
    }
  }, [authenticated]);
}