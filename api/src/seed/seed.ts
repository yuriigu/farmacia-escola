import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data (in order of dependencies)
  await prisma.appointmentItem.deleteMany();
  await prisma.disposal.deleteMany();
  await prisma.withdrawalItem.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();

  // ===== USERS =====
  const adminPass = await bcrypt.hash('admin123', 10);
  const farmPass = await bcrypt.hash('farm123', 10);
  const alunoPass = await bcrypt.hash('aluno123', 10);
  const pacPass = await bcrypt.hash('paciente123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin Sistema', email: 'admin@farmaciaescola.edu.br', password: adminPass, role: Role.ADMIN, active: true, registerDoc: 'CRF/SP 00001' },
  });

  const farm1 = await prisma.user.create({
    data: { name: 'Farm. Luciana Mendes', email: 'luciana@farmaciaescola.edu.br', password: farmPass, role: Role.FARMACEUTICO, active: true, registerDoc: 'CRF/SP 12345' },
  });

  const farm2 = await prisma.user.create({
    data: { name: 'Farm. Pedro Almeida', email: 'pedro@farmaciaescola.edu.br', password: farmPass, role: Role.FARMACEUTICO, active: true, registerDoc: 'CRF/SP 12346' },
  });

  const aluno = await prisma.user.create({
    data: { name: 'Ana Souza (Aluna)', email: 'ana.aluna@farmaciaescola.edu.br', password: alunoPass, role: Role.ALUNO, active: true, registerDoc: 'RA 2024001' },
  });

  const pacUser = await prisma.user.create({
    data: { name: 'João Silva', email: 'joao@email.com', password: pacPass, role: Role.PACIENTE, active: true },
  });

  // ===== PATIENTS =====
  const pac1 = await prisma.patient.create({
    data: { name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 99999-0001', birthDate: new Date('1990-05-15'), address: 'Rua A, 100, São Paulo', userId: pacUser.id },
  });

  const pac2 = await prisma.patient.create({
    data: { name: 'Maria Oliveira', cpf: '987.654.321-00', phone: '(11) 99999-0002', birthDate: new Date('1985-11-20'), address: 'Av. B, 200, São Paulo' },
  });

  const pac3 = await prisma.patient.create({
    data: { name: 'Carlos Santos', cpf: '456.789.123-00', phone: '(11) 99999-0003', birthDate: new Date('1975-03-10') },
  });

  // ===== MEDICINES =====
  const med1 = await prisma.medicine.create({
    data: { name: 'Paracetamol', activeIngredient: 'Paracetamol', dosage: '750mg', accessibleDesc: 'Analgésico e antitérmico para dor e febre. Tomar 1 comprimido a cada 8 horas, não excedendo 4 por dia.', category: 'analgesico' },
  });

  const med2 = await prisma.medicine.create({
    data: { name: 'Ibuprofeno', activeIngredient: 'Ibuprofeno', dosage: '400mg', accessibleDesc: 'Anti-inflamatório não esteroidal. Indicado para dores leves a moderadas e inflamações.', category: 'anti-inflamatorio' },
  });

  const med3 = await prisma.medicine.create({
    data: { name: 'Amoxicilina', activeIngredient: 'Amoxicilina tri-hidratada', dosage: '500mg', accessibleDesc: 'Antibiótico de amplo espectro. Usar conforme prescrição médica. Completar o tratamento.', category: 'antibiotico' },
  });

  const med4 = await prisma.medicine.create({
    data: { name: 'Dipirona Sódica', activeIngredient: 'Dipirona sódica', dosage: '500mg', accessibleDesc: 'Analgésico, antipirético e espasmolítico. Para dor e febre.', category: 'analgesico' },
  });

  const med5 = await prisma.medicine.create({
    data: { name: 'Loratadina', activeIngredient: 'Loratadina', dosage: '10mg', accessibleDesc: 'Antialérgico de segunda geração. Tomar 1 comprimido ao dia.', category: 'antialergico' },
  });

  const med6 = await prisma.medicine.create({
    data: { name: 'Omeprazol', activeIngredient: 'Omeprazol', dosage: '20mg', accessibleDesc: 'Inibidor de bomba de prótons. Para gastrite e úlcera. Tomar em jejum.', category: 'antihipertensivo' },
  });

  // ===== STOCK BATCHES =====
  const now = new Date();
  const batch1 = await prisma.stockBatch.create({
    data: { medicineId: med1.id, batchNumber: 'LOT-2024-001', currentQuantity: 150, expirationDate: new Date(now.getFullYear() + 1, 5, 15) },
  });

  const batch2 = await prisma.stockBatch.create({
    data: { medicineId: med2.id, batchNumber: 'LOT-2024-002', currentQuantity: 80, expirationDate: new Date(now.getFullYear() + 1, 8, 20) },
  });

  const batch3 = await prisma.stockBatch.create({
    data: { medicineId: med3.id, batchNumber: 'LOT-2024-003', currentQuantity: 45, expirationDate: new Date(now.getFullYear() + 1, 2, 10) },
  });

  const batch4 = await prisma.stockBatch.create({
    data: { medicineId: med4.id, batchNumber: 'LOT-2024-004', currentQuantity: 200, expirationDate: new Date(now.getFullYear() + 1, 11, 30) },
  });

  const batch5 = await prisma.stockBatch.create({
    data: { medicineId: med5.id, batchNumber: 'LOT-2024-005', currentQuantity: 60, expirationDate: new Date(now.getFullYear() + 1, 4, 25) },
  });

  const batch6 = await prisma.stockBatch.create({
    data: { medicineId: med6.id, batchNumber: 'LOT-2024-006', currentQuantity: 30, expirationDate: new Date(now.getFullYear() + 1, 7, 18) },
  });

  // ===== WITHDRAWALS (histórico) =====
  await prisma.withdrawal.create({
    data: {
      patientId: pac1.id, userId: farm1.id, notes: 'Orientações de uso fornecidas',
      items: { create: { batchId: batch1.id, quantity: 10 } },
    },
  });

  await prisma.withdrawal.create({
    data: {
      patientId: pac2.id, userId: farm2.id, notes: 'Paciente com dor de cabeça persistente',
      items: { create: { batchId: batch2.id, quantity: 20 } },
    },
  });

  await prisma.withdrawal.create({
    data: {
      patientId: pac1.id, userId: farm1.id, notes: 'Retirada mensal',
      items: { create: { batchId: batch4.id, quantity: 15 } },
    },
  });

  // ===== DISPOSALS =====
  await prisma.disposal.create({
    data: { batchId: batch3.id, userId: farm1.id, quantity: 5, reason: 'Embalagem Danificada' },
  });

  await prisma.disposal.create({
    data: { batchId: batch1.id, userId: farm2.id, quantity: 3, reason: 'Vencimento próximo' },
  });

  // ===== SCHEDULE SLOTS (Escala de Horários) =====
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
  const day3 = new Date(today); day3.setDate(today.getDate() + 3);

  const TIME_SLOTS = ['08:00', '09:00', '10:00', '13:00', '14:00', '15:00'];

  // Create slots for next several days, assigned to farmacêuticos
  for (const date of [tomorrow, dayAfter, day3]) {
    for (const ts of TIME_SLOTS) {
      await prisma.scheduleSlot.create({
        data: {
          date,
          timeSlot: ts,
          maxCapacity: 4,
          active: true,
          assignedToId: ts < '12:00' ? farm1.id : farm2.id,
        },
      });
    }
  }

  // Today's remaining slots
  const todaySlots = ['14:00', '15:00'];
  for (const ts of todaySlots) {
    await prisma.scheduleSlot.create({
      data: {
        date: today,
        timeSlot: ts,
        maxCapacity: 4,
        active: true,
        assignedToId: farm2.id,
      },
    });
  }

  // ===== APPOINTMENTS (Novo fluxo: agendamento de retirada) =====
  // Pending appointment with items
  const slotTomorrow9 = await prisma.scheduleSlot.findFirst({
    where: { date: tomorrow, timeSlot: '09:00' },
  });
  const slotDayAfter14 = await prisma.scheduleSlot.findFirst({
    where: { date: dayAfter, timeSlot: '14:00' },
  });
  const slotToday14 = await prisma.scheduleSlot.findFirst({
    where: { date: today, timeSlot: '14:00' },
  });

  if (slotTomorrow9) {
    await prisma.appointment.create({
      data: {
        patientId: pac1.id,
        scheduledDate: tomorrow,
        scheduledTime: '09:00',
        slotId: slotTomorrow9.id,
        status: 'PENDING',
        notes: 'Retirada mensal de medicamentos',
        items: {
          create: [
            { medicineId: med1.id, quantity: 10 },
            { medicineId: med4.id, quantity: 5 },
          ],
        },
      },
    });
  }

  if (slotDayAfter14) {
    await prisma.appointment.create({
      data: {
        patientId: pac2.id,
        scheduledDate: dayAfter,
        scheduledTime: '14:00',
        slotId: slotDayAfter14.id,
        status: 'CONFIRMED',
        notes: 'Paciente já orientado pelo farmacêutico',
        items: {
          create: [
            { medicineId: med2.id, quantity: 20 },
          ],
        },
      },
    });
  }

  if (slotToday14) {
    await prisma.appointment.create({
      data: {
        patientId: pac3.id,
        scheduledDate: today,
        scheduledTime: '14:00',
        slotId: slotToday14.id,
        status: 'PENDING',
        notes: 'Primeira retirada',
        items: {
          create: [
            { medicineId: med5.id, quantity: 10 },
            { medicineId: med6.id, quantity: 5 },
          ],
        },
      },
    });
  }

  console.log('✅ Seed data created successfully!');
  console.log('');
  console.log('👥 Users:');
  console.log('   ADMIN:      admin@farmaciaescola.edu.br / admin123');
  console.log('   FARM:       luciana@farmaciaescola.edu.br / farm123');
  console.log('   FARM:       pedro@farmaciaescola.edu.br / farm123');
  console.log('   ALUNO:      ana.aluna@farmaciaescola.edu.br / aluno123');
  console.log('   PACIENTE:   joao@email.com / paciente123');
  console.log('');
  console.log('📦 Medicines:', 6);
  console.log('📊 Batches:', 6);
  console.log('📋 Patients:', 3);
  console.log('🕐 Schedule Slots: ~20');
  console.log('📅 Appointments: 3');
  console.log('📤 Withdrawals: 3');
  console.log('🗑️  Disposals: 2');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
