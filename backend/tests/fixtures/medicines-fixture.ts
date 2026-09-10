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

export const mockMedicinesList = [mockMedicine, mockControlledMedicine];