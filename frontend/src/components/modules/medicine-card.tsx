'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StockStatusBadge } from '@/components/shared/stock-status-badge';
import type { Medicine, StockStatus } from '@/lib/types';

interface MedicineCardProps {
  medicine: Medicine;
  onSelect?: (medicine: Medicine) => void;
}

export function MedicineCard({ medicine, onSelect }: MedicineCardProps) {
  const getStatus = (qty: number): StockStatus => {
    if (qty === 0) {
      return 'critical';
    }
    if (qty < 20) {
      return 'low';
    }
    return 'ok';
  };

  let totalQty = 0;
  if (medicine.totalQuantity !== undefined) {
    if (medicine.totalQuantity !== null) {
      totalQty = medicine.totalQuantity;
    } else {
      totalQty = 0;
    }
  } else {
    totalQty = 0;
  }

  let renderedCategory: React.ReactNode = null;
  if (medicine.category) {
    renderedCategory = (
      <p className="text-xs text-slate-500 font-medium">{medicine.category}</p>
    );
  }

  let renderedDosage: React.ReactNode = null;
  if (medicine.dosage) {
    renderedDosage = (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-medium">Dosagem:</span> {medicine.dosage}
      </p>
    );
  }

  let renderedAccessibleDesc: React.ReactNode = null;
  if (medicine.accessibleDesc) {
    renderedAccessibleDesc = (
      <p className="text-xs text-slate-500 italic mt-2">
        {medicine.accessibleDesc}
      </p>
    );
  }

  return (
    <Card
      data-testid="medicine-card"
      className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-800"
      onClick={() => {
        if (onSelect) {
          onSelect(medicine);
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {medicine.name}
          </CardTitle>
          <StockStatusBadge status={getStatus(totalQty)} />
        </div>
        {renderedCategory}
      </CardHeader>
      <CardContent className="space-y-1">
        {renderedDosage}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">Estoque total:</span> {totalQty} un
        </p>
        {renderedAccessibleDesc}
      </CardContent>
    </Card>
  );
}