'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StockStatusBadge } from '@/components/shared/stock-status-badge';
import type { Medicine, StockStatus } from '@/types';

// props do card de medicamento. o onselect e opcional porque o card
// pode ser usado so pra exibir (em listagens, grids, testes) sem
// disparar nenhuma acao de clique.
interface MedicineCardProps {
  medicine: Medicine;
  onSelect?: (medicine: Medicine) => void;
  hideStock?: boolean;
}

// card de medicamento. mostra nome, status de estoque, categoria,
// dosagem, quantidade total e descricao acessivel. o status e
// derivado da quantidade total com faixas fixas locais.
export function MedicineCard({ medicine, onSelect, hideStock = false }: MedicineCardProps) {
  // deriva o status a partir da quantidade total.
  // regra local (so pra esse card): zero e critico, menos de 20 e
  // baixo, o resto e ok.
  const getStatus = (qty: number): StockStatus => {
    if (qty === 0) {
      return 'critical';
    }
    if (qty < 20) {
      return 'low';
    }
    return 'ok';
  };

  // resolve a quantidade total com fallback zero.
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

  // bloco de categoria, so renderiza se existir.
  let renderedCategory: React.ReactNode = null;
  if (medicine.category) {
    renderedCategory = (
      <p className="text-xs text-slate-500 font-medium">{medicine.category}</p>
    );
  }

  // bloco de dosagem, so renderiza se existir.
  let renderedDosage: React.ReactNode = null;
  if (medicine.dosage) {
    renderedDosage = (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-medium">Dosagem:</span> {medicine.dosage}
      </p>
    );
  }

  // bloco de descricao acessivel, so renderiza se existir.
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
        // clicar no card dispara o onselect quando ele foi passado.
        // sem onselect, o card vira so leitura (sem efeito colateral).
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
          <StockStatusBadge
            status={hideStock ? (medicine.available ? 'IN_STOCK' : 'OUT_OF_STOCK') : getStatus(totalQty)}
            variant={hideStock ? 'patient' : 'default'}
            available={hideStock ? medicine.available : undefined}
          />
        </div>
        {renderedCategory}
      </CardHeader>
      <CardContent className="space-y-1">
        {renderedDosage}
        {!hideStock && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Estoque total:</span> {totalQty} un
          </p>
        )}
        {renderedAccessibleDesc}
      </CardContent>
    </Card>
  );
}