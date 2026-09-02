'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from './api';
import type { Medicine, Withdrawal, Disposal, Appointment, Batch, Patient, ScheduleSlot } from './types';

interface PharmacyState {
  medicines: Medicine[];
  batches: Batch[];
  withdrawals: Withdrawal[];
  disposals: Disposal[];
  appointments: Appointment[];
  patients: Patient[];
  scheduleSlots: ScheduleSlot[];
  loading: boolean;
}

export const usePharmacyStore = create<PharmacyState>(() => ({
  medicines: [],
  batches: [],
  withdrawals: [],
  disposals: [],
  appointments: [],
  patients: [],
  scheduleSlots: [],
  loading: true,
}));

// Data fetching actions (not inside store creation)
export function fetchAllData() {
  usePharmacyStore.setState({ loading: true });
  api.getMedicines().then((medicines) => usePharmacyStore.setState({ medicines })).catch(() => {});
  api.getWithdrawals().then((withdrawals) => usePharmacyStore.setState({ withdrawals })).catch(() => {});
  api.getDisposals().then((disposals) => usePharmacyStore.setState({ disposals })).catch(() => {});
  api.getAppointments().then((appointments) => usePharmacyStore.setState({ appointments })).catch(() => {});
  // Set loading false after a delay to ensure all requests have had a chance
  setTimeout(() => usePharmacyStore.setState({ loading: false }), 500);
}

export function fetchBatchesData(): Promise<void> {
  return api.getBatches()
    .then((batches) => usePharmacyStore.setState({ batches }))
    .catch(() => {});
}

export function fetchScheduleSlotsData(params?: { startDate?: string; endDate?: string }): Promise<void> {
  return api.getScheduleSlots(params)
    .then((scheduleSlots) => usePharmacyStore.setState({ scheduleSlots }))
    .catch(() => {});
}

// Hook to auto-load data on mount (when authenticated)
export function useDataLoader(authenticated: boolean) {
  useEffect(() => {
    if (authenticated) {
      fetchAllData();
    }
  }, [authenticated]);
}