'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import type { Medicine } from '@/lib/types';

interface MedicineCardProps {
  medicine: Medicine;
  onSelect?: (medicine: Medicine) => void;
}

export function MedicineCard({ medicine, onSelect }: MedicineCardProps) {
  const getStatus = (qty: number) => {
    if (qty === 0) return 'critical';
    if (qty < 20) return 'low';
    return 'ok';
  };

  return (
    <Card
      data-testid="medicine-card"
      className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-800"
      onClick={() => onSelect?.(medicine)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {medicine.name}
          </CardTitle>
          <StockStatusBadge status={getStatus(medicine.totalQuantity || 0)} />
        </div>
        {medicine.category && (
          <p className="text-xs text-slate-500 font-medium">{medicine.category}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {medicine.dosage && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Dosagem:</span> {medicine.dosage}
          </p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">Estoque total:</span> {medicine.totalQuantity || 0} un
        </p>
        {medicine.accessibleDesc && (
          <p className="text-xs text-slate-500 italic mt-2">
            {medicine.accessibleDesc}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
