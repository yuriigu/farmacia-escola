'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from './api';
import type { Medicine, Disposal, Appointment, Batch, Patient, ScheduleSlot } from '@/types';
import { useAuthStore } from './auth-store';
import { QUERY_KEYS } from '@/services/queries';
import { queryClient } from '@/providers/query-provider';

const FETCH_TTL_MS = 60_000;
let inflight: Promise<void> | null = null;
let inflightSession: string | null = null;
let lastFetchedAt = 0;
let lastFetchedRole: string | undefined;
let lastFetchedSession: string | null = null;

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
  lastFetchedAt: number;
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
  lastFetchedAt: 0,
}));

function seedQueryCache(
  userRole: string | undefined,
  role: string | undefined,
  loaded: ReadonlySet<string>,
) {
  const state = usePharmacyStore.getState();
  if (loaded.has('medicines')) {
    queryClient.setQueryData([...QUERY_KEYS.medicines, userRole], state.medicines);
  }
  if (loaded.has('appointments')) {
    queryClient.setQueryData(QUERY_KEYS.appointments, state.appointments);
  }
  if (loaded.has('scheduleSlots')) {
    queryClient.setQueryData(QUERY_KEYS.scheduleSlots(undefined), state.scheduleSlots);
  }
  if (loaded.has('patients') && ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'].includes(role ?? '')) {
    queryClient.setQueryData(QUERY_KEYS.patients(undefined), state.patients);
  }
  if (loaded.has('disposals') && ['ADMIN', 'FARMACEUTICO', 'ALUNO'].includes(role ?? '')) {
    queryClient.setQueryData(QUERY_KEYS.disposals, state.disposals);
  }
}

// carrega em paralelo os dados permitidos para o papel atual. chamadas
// concorrentes compartilham o mesmo carregamento e a janela TTL evita
// refetch durante a navegacao entre telas.
export function fetchAllData(force = false): Promise<void> {
  const currentUser = useAuthStore.getState().user;
  const session = useAuthStore.getState().token;
  const role = currentUser?.role?.toUpperCase();
  if (inflight) {
    if (inflightSession === session) return inflight;
    return inflight.then(() => fetchAllData(force));
  }
  const identityChanged = lastFetchedSession !== null
    && (session !== lastFetchedSession || role !== lastFetchedRole);
  if (identityChanged) {
    queryClient.clear();
    usePharmacyStore.setState({
      appointments: [],
      patients: [],
      disposals: [],
      scheduleSlots: [],
    });
  }
  if (!force && session === lastFetchedSession && role === lastFetchedRole && Date.now() - lastFetchedAt < FETCH_TTL_MS) {
    return Promise.resolve();
  }

  usePharmacyStore.setState({ loading: true });
  const staleTime = force || session !== lastFetchedSession || role !== lastFetchedRole
    ? 0
    : FETCH_TTL_MS;
  const canReadPatients = ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'].includes(role ?? '');
  const canReadDisposals = ['ADMIN', 'FARMACEUTICO', 'ALUNO'].includes(role ?? '');
  const loaded = new Set<string>();
  const jobs: Promise<void>[] = [
    queryClient.fetchQuery({
      queryKey: [...QUERY_KEYS.medicines, currentUser?.role],
      queryFn: api.getMedicines,
      staleTime,
    }).then((medicines) => {
      usePharmacyStore.setState({ medicines });
      loaded.add('medicines');
    }),
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.appointments,
      queryFn: api.getAppointments,
      staleTime,
    }).then((appointments) => {
      usePharmacyStore.setState({ appointments });
      loaded.add('appointments');
    }),
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.scheduleSlots(undefined),
      queryFn: () => api.getScheduleSlots(),
      staleTime,
    }).then((scheduleSlots) => {
      usePharmacyStore.setState({ scheduleSlots });
      loaded.add('scheduleSlots');
    }),
  ];

  if (canReadPatients) {
    jobs.push(queryClient.fetchQuery({
      queryKey: QUERY_KEYS.patients(undefined),
      queryFn: () => api.getPatients(),
      staleTime,
    }).then((patients) => {
      usePharmacyStore.setState({ patients });
      loaded.add('patients');
    }));
  }
  if (canReadDisposals) {
    jobs.push(queryClient.fetchQuery({
      queryKey: QUERY_KEYS.disposals,
      queryFn: api.getDisposals,
      staleTime,
    }).then((disposals) => {
      usePharmacyStore.setState({ disposals });
      loaded.add('disposals');
    }));
  }

  const currentFetch = Promise.allSettled(jobs).then(() => {
    lastFetchedAt = Date.now();
    lastFetchedRole = role;
    lastFetchedSession = session;
    seedQueryCache(currentUser?.role, role, loaded);
    usePharmacyStore.setState({ loading: false, lastFetchedAt });
  }).finally(() => {
    if (inflight === currentFetch) {
      inflight = null;
      inflightSession = null;
    }
  });
  inflight = currentFetch;
  inflightSession = session;
  return currentFetch;
}

export function fetchAppointmentsData(): Promise<void> {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.appointments,
    queryFn: api.getAppointments,
    staleTime: 0,
  })
    .then((appointments) => {
      usePharmacyStore.setState({ appointments });
      queryClient.setQueryData(QUERY_KEYS.appointments, appointments);
    })
    .catch(() => {});
}

export function fetchMedicinesData(): Promise<void> {
  const role = useAuthStore.getState().user?.role;
  return queryClient.fetchQuery({
    queryKey: [...QUERY_KEYS.medicines, role],
    queryFn: api.getMedicines,
    staleTime: 0,
  })
    .then((medicines) => {
      usePharmacyStore.setState({ medicines });
      queryClient.setQueryData([...QUERY_KEYS.medicines, role], medicines);
    })
    .catch(() => {});
}

export function fetchDisposalsData(): Promise<void> {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.disposals,
    queryFn: api.getDisposals,
    staleTime: 0,
  })
    .then((disposals) => {
      usePharmacyStore.setState({ disposals });
      queryClient.setQueryData(QUERY_KEYS.disposals, disposals);
    })
    .catch(() => {});
}

// recarrega so a lista de lotes. e chamada por telas que mexem em
// estoque (batch, inventario) depois de criar/editar/ajustar, pra
// refletir o saldo atualizado sem recarregar tudo.
export function fetchBatchesData(): Promise<void> {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.batches(),
    queryFn: () => api.getBatches(),
    staleTime: 0,
  })
    .then((batches) => {
      usePharmacyStore.setState({ batches });
      queryClient.setQueryData(QUERY_KEYS.batches(), batches);
    })
    .catch(() => {});
}

// recarrega a lista de slots de escala, com filtro opcional de
// periodo. e usada pela tela de escala e pelos modais que precisam
// listar horarios disponiveis.
export function fetchScheduleSlotsData(params?: { startDate?: string; endDate?: string }): Promise<void> {
  return queryClient.fetchQuery({
    queryKey: QUERY_KEYS.scheduleSlots(params),
    queryFn: () => api.getScheduleSlots(params),
    staleTime: 0,
  })
    .then((scheduleSlots) => {
      usePharmacyStore.setState({ scheduleSlots });
      queryClient.setQueryData(QUERY_KEYS.scheduleSlots(params), scheduleSlots);
    })
    .catch(() => {});
}

// hook que dispara o fetchall automaticamente quando o usuario
// esta autenticado. o parametro authenticated serve pra nao
// carregar antes da hidratacao do token. mudou de autenticado pra
// nao autenticado, o efeito nao faz nada (nada a carregar sem sessao).
export function useDataLoader(authenticated: boolean) {
  useEffect(() => {
    if (authenticated) {
      void fetchAllData();
    }
  }, [authenticated]);
}