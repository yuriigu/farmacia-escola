// fixture de medicamento usada nos testes. representa um medicamento
// comum do catalogo (analgesico), sem flag de controlado, com estoque
// confortavel. os valores sao fixos de proposito pra deixar os testes
// deterministicos e faceis de comparar.

export const mockMedicine = {
  id: 1,
  name: 'Paracetamol',
  activeIngredient: 'Paracetamol',
  dosage: '500mg',
  category: 'ANALGESICOS',
  accessibleDesc: 'Medicamento para dor e febre',
  instructions: 'Tomar 1 comprimido a cada 8 horas se houver dor',
  isControlled: false,
  totalQuantity: 150,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// variacao de medicamento controlado. existe pra cobrir os fluxos
// que tratam receita/restricao diferente do medicamento comum, e pra
// ter um segundo item na lista (util em testes de filtro e paginacao).
export const mockControlledMedicine = {
  id: 2,
  name: 'Clonazepam',
  activeIngredient: 'Clonazepam',
  dosage: '2mg',
  category: 'CONTROLADOS',
  accessibleDesc: 'Medicamento controlado',
  instructions: 'Uso sob prescrição médica',
  isControlled: true,
  totalQuantity: 30,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// lista com as duas variacoes, pra testes que consomem array
// (listagens, filtros, paginacao).
export const mockMedicinesList = [mockMedicine, mockControlledMedicine];