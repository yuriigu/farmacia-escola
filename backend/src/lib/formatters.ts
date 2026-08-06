type MedicineRef = { name: string; dosage: string | null };
type BatchWithMedicine = {
  id: number;
  batchNumber: string;
  expirationDate: Date;
  currentQuantity: number;
  medicine: MedicineRef;
};

type WithdrawalRecord = {
  id: number;
  date: Date;
  notes: string | null;
  patient: { name: string; cpf: string | null };
  user: { name: string };
  items: Array<{
    quantity: number;
    batch: BatchWithMedicine;
  }>;
};

type DisposalRecord = {
  id: number;
  date: Date;
  quantity: number;
  reason: string | null;
  reverted: boolean;
  user: { name: string };
  batch: BatchWithMedicine;
};

export function formatMedicineList(medicines: Array<{
  id: number;
  name: string;
  activeIngredient: string | null;
  dosage: string | null;
  accessibleDesc: string | null;
  createdAt: Date;
  batches: Array<{ currentQuantity: number }>;
}>) {
  return medicines.map((med) => ({
    id: med.id,
    name: med.name,
    activeIngredient: med.activeIngredient ?? '',
    dosage: med.dosage ?? '',
    accessibleDesc: med.accessibleDesc ?? '',
    totalQuantity: med.batches.reduce((acc, batch) => acc + batch.currentQuantity, 0),
    batchesCount: med.batches.length,
    createdAt: med.createdAt,
  }));
}

export function formatWithdrawals(withdrawals: WithdrawalRecord[]) {
  return withdrawals.flatMap((withdrawal) => {
    if (withdrawal.items.length === 0) return [];

    return withdrawal.items.map((item) => ({
      id: withdrawal.id,
      createdAt: withdrawal.date.toISOString(),
      quantity: item.quantity,
      notes: withdrawal.notes ?? '',
      patient: {
        name: withdrawal.patient.name,
        cpf: withdrawal.patient.cpf ?? '',
      },
      batch: {
        id: item.batch.id,
        code: item.batch.batchNumber,
        medicine: {
          name: item.batch.medicine.name,
          dosage: item.batch.medicine.dosage ?? '',
        },
      },
      user: { name: withdrawal.user.name },
    }));
  });
}

export function formatDisposals(disposals: DisposalRecord[]) {
  return disposals.map((disposal) => ({
    id: disposal.id,
    createdAt: disposal.date.toISOString(),
    quantity: disposal.quantity,
    reason: disposal.reason ?? '',
    reverted: disposal.reverted,
    batch: {
      id: disposal.batch.id,
      code: disposal.batch.batchNumber,
      expiresAt: disposal.batch.expirationDate.toISOString(),
      medicine: {
        name: disposal.batch.medicine.name,
        dosage: disposal.batch.medicine.dosage ?? '',
      },
    },
    user: { name: disposal.user.name },
  }));
}

export function formatBatchAlerts(
  batches: BatchWithMedicine[],
  expiringWithinDays = 30
) {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;

  return batches
    .map((batch) => {
      const daysToExpire = Math.ceil(
        (batch.expirationDate.getTime() - now.getTime()) / msPerDay
      );
      const isEmpty = batch.currentQuantity === 0;
      const isExpiring = !isEmpty && daysToExpire <= expiringWithinDays;

      if (!isEmpty && !isExpiring) return null;

      return {
        id: batch.id,
        code: batch.batchNumber,
        expiresAt: batch.expirationDate.toISOString(),
        quantity: batch.currentQuantity,
        medicine: {
          name: batch.medicine.name,
          dosage: batch.medicine.dosage ?? '',
        },
        type: isEmpty ? ('empty' as const) : ('expiring' as const),
        daysToExpire: Math.max(daysToExpire, 0),
      };
    })
    .filter((alert): alert is NonNullable<typeof alert> => alert !== null)
    .sort((a, b) => a.daysToExpire - b.daysToExpire);
}
