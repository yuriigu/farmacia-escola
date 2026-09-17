import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { Role } from '../types/enums';
import bcrypt from 'bcryptjs';

// OTIMIZADO: timeout de operação (10s) para evitar P1008 em
// ambientes com I/O lento (Docker volume, NFS, discos congestionados).
// O seed faz DELETEs em cascata; com o DB ocupado ou disco lento, o
// padrão (sem timeout explícito) pode estourar.
// NOTA: o Config do @libsql/client só aceita `url`; timeout extra
// é gerenciado via retry/backoff neste arquivo (veja retryWithBackoff).
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  // @libsql/client Config só aceita url no tipo; timeout é tratado
  // por middleware/retry abaixo para evitar P1008.
});

// ---------------------------------------------------------------------
// RETRY COM BACKOFF (evita P1008 — Operation timed out / SocketTimeout)
// ---------------------------------------------------------------------
// Em ambientes Docker com volume montado, o SQLite/LibSQL pode levar
// mais tempo em operações de escrita (DELETE em cascata, inserts
// em lote). Esta função tenta a operação até `maxAttempts` vezes
// com backoff exponencial, logando cada falha.
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTimeout =
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'P1008';
      console.warn(
        `[seed:retry] ${label} — tentativa ${attempt}/${maxAttempts}${
          isTimeout ? ' (P1008 timeout)' : ''
        }: ${err instanceof Error ? err.message : err}`
      );
      if (attempt < maxAttempts) {
        // Backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
        const delayMs = Math.min(200 * 2 ** (attempt - 1), 4000);
        console.warn(`[seed:retry] ${label} — aguardando ${delayMs}ms antes da próxima tentativa`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
const prisma = new PrismaClient({ adapter });

async function main() {
  // OTIMIZADO: Configurar busy_timeout para mitigar "database is locked"
  // em ambientes com I/O lento ou contention (Docker volume, NFS).
  // O SQLite/LibSQL usa bloqueio a nível de arquivo; com esse PRAGMA,
  // operações que encontrarem o DB trancado aguardam e retentam
  // internamente em até 5s antes de falhar com SQLITE_BUSY.
  try {
    await prisma.$executeRaw`PRAGMA busy_timeout = 5000`;
    console.log('[seed] busy_timeout configurado para 5000ms');
  } catch (err) {
    console.warn('[seed] Falha ao configurar busy_timeout (pode ser restrito pelo adapter):', err);
  }

  // GUARDA DE SEGURANCA: O SEED CRIA USUARIOS COM SENHAS PADRAO FRACAS
  // (admin123, farm123, ...). A EXECUCAO EM PRODUCAO E BLOQUEADA POR PADRAO
  // PARA EVITAR CONTAS COM CREDENCIAIS PREVISIVEIS NO AMBIENTE REAL.
  // PARA AMBIENTES DE DEMONSTRACAO, DEFINA SEED_ALLOW_INSECURE_PASSWORDS=true.
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SEED_ALLOW_INSECURE_PASSWORDS !== 'true') {
      throw new Error(
        'Seed bloqueado em produção: ele cria usuários com senhas padrão. Use SEED_ALLOW_INSECURE_PASSWORDS=true apenas em ambientes controlados.'
      );
    }
  }

  // OTIMIZADO: deletes envoltos em retry com backoff exponencial para
  // tolerar P1008 (Operation timed out / SocketTimeout) causado por
  // disco congestionado, volume Docker ocupado ou contention do SQLite.
  // A ordem respeita as FKs (tabelas filhas antes das pai).
  await retryWithBackoff(
    () => prisma.appointmentItem.deleteMany(),
    'appointmentItem.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.disposal.deleteMany(),
    'disposal.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.appointment.deleteMany(),
    'appointment.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.scheduleSlot.deleteMany(),
    'scheduleSlot.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.stockBatch.deleteMany(),
    'stockBatch.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.patient.deleteMany(),
    'patient.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.medicine.deleteMany(),
    'medicine.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.activityLog.deleteMany(),
    'activityLog.deleteMany',
  );
  await retryWithBackoff(
    () => prisma.user.deleteMany(),
    'user.deleteMany',
  );

  const adminPass = await bcrypt.hash('admin123', 10);
  const farmPass = await bcrypt.hash('farm123', 10);
  const medPass = await bcrypt.hash('medico123', 10);
  const alunoPass = await bcrypt.hash('aluno123', 10);
  const pacPass = await bcrypt.hash('paciente123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin Sistema', email: 'admin@farmaciaescola.edu.br', password: adminPass, role: Role.ADMIN, active: true, registerDoc: 'CRF/SP 00001' },
  });

  const farmaceutico = await prisma.user.create({
    data: { name: 'Farm. Luciana Mendes', email: 'luciana@farmaciaescola.edu.br', password: farmPass, role: Role.FARMACEUTICO, active: true, registerDoc: 'CRF/SP 12345' },
  });

  const medico = await prisma.user.create({
    data: { name: 'Dr. Roberto Santos', email: 'roberto.medico@farmaciaescola.edu.br', password: medPass, role: Role.MEDICO, active: true, registerDoc: 'CRM/SP 98765' },
  });

  const aluno = await prisma.user.create({
    data: { name: 'Ana Souza (Aluna)', email: 'ana.aluna@farmaciaescola.edu.br', password: alunoPass, role: Role.ALUNO, active: true, registerDoc: 'RA 2024001' },
  });

  const pacUser = await prisma.user.create({
    data: { name: 'João Silva', email: 'joao@email.com', password: pacPass, role: Role.PACIENTE, active: true },
  });

  const pac1 = await prisma.patient.create({
    data: { name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 99999-0001', birthDate: new Date('1990-05-15'), address: 'Rua A, 100, São Paulo', userId: pacUser.id },
  });

  const pac2 = await prisma.patient.create({
    data: { name: 'Maria Oliveira', cpf: '987.654.321-00', phone: '(11) 99999-0002', birthDate: new Date('1985-11-20'), address: 'Av. B, 200, São Paulo' },
  });

  const pac3 = await prisma.patient.create({
    data: { name: 'Carlos Santos', cpf: '456.789.123-00', phone: '(11) 99999-0003', birthDate: new Date('1975-03-10') },
  });

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

  const now = new Date();

  const batch1a = await prisma.stockBatch.create({
    data: { medicineId: med1.id, batchNumber: 'LOT-2024-001A', currentQuantity: 15, expirationDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()) }, // vencimento próximo
  });
  const batch1b = await prisma.stockBatch.create({
    data: { medicineId: med1.id, batchNumber: 'LOT-2024-001B', currentQuantity: 150, expirationDate: new Date(now.getFullYear() + 1, 5, 15) }, // vencimento distante
  });

  const batch2 = await prisma.stockBatch.create({
    data: { medicineId: med2.id, batchNumber: 'LOT-2024-002', currentQuantity: 80, expirationDate: new Date(now.getFullYear() + 1, 8, 20) },
  });

  const batch3 = await prisma.stockBatch.create({
    data: { medicineId: med3.id, batchNumber: 'LOT-2024-003', currentQuantity: 45, expirationDate: new Date(now.getFullYear() - 1, 2, 10) }, // já vencido
  });

  const batch4 = await prisma.stockBatch.create({
    data: { medicineId: med4.id, batchNumber: 'LOT-2024-004', currentQuantity: 200, expirationDate: new Date(now.getFullYear() + 1, 11, 30) },
  });

  const batch5 = await prisma.stockBatch.create({
    data: { medicineId: med5.id, batchNumber: 'LOT-2024-005', currentQuantity: 60, expirationDate: new Date(now.getFullYear() + 1, 4, 25) },
  });

  const batch6 = await prisma.stockBatch.create({
    data: { medicineId: med6.id, batchNumber: 'LOT-2024-006', currentQuantity: 3, expirationDate: new Date(now.getFullYear() + 1, 7, 18) }, // estoque baixo
  });

  await prisma.disposal.create({
    data: { batchId: batch3.id, userId: farmaceutico.id, quantity: 5, reason: 'Medicamento Vencido' },
  });

  await prisma.disposal.create({
    data: { batchId: batch1a.id, userId: aluno.id, quantity: 2, reason: 'Embalagem Danificada' },
  });

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
  const day3 = new Date(today); day3.setDate(today.getDate() + 3);

  const TIME_SLOTS = ['08:00', '09:00', '10:00', '13:00', '14:00', '15:00'];

  for (const date of [tomorrow, dayAfter, day3]) {
    for (const ts of TIME_SLOTS) {
      await prisma.scheduleSlot.create({
        data: { date, timeSlot: ts, maxCapacity: 4, active: true, assignedToId: farmaceutico.id },
      });
    }
  }

  const todaySlots = ['14:00', '15:00'];
  for (const ts of todaySlots) {
    await prisma.scheduleSlot.create({
      data: { date: today, timeSlot: ts, maxCapacity: 4, active: true, assignedToId: farmaceutico.id },
    });
  }

  const slotTomorrow9 = await prisma.scheduleSlot.findFirst({ where: { date: tomorrow, timeSlot: '09:00' } });
  const slotDayAfter14 = await prisma.scheduleSlot.findFirst({ where: { date: dayAfter, timeSlot: '14:00' } });
  const slotToday14 = await prisma.scheduleSlot.findFirst({ where: { date: today, timeSlot: '14:00' } });
  const slotToday15 = await prisma.scheduleSlot.findFirst({ where: { date: today, timeSlot: '15:00' } });
  const slotDay3_10 = await prisma.scheduleSlot.findFirst({ where: { date: day3, timeSlot: '10:00' } });

  // ---------------------------------------------------------------------
  // AGENDAMENTOS — cobrindo os quatro status possíveis: PENDING,
  // CONFIRMED, COMPLETED e CANCELLED.
  // ---------------------------------------------------------------------
  if (slotTomorrow9) {
    await prisma.appointment.create({
      data: {
        patientId: pac1.id, scheduledDate: tomorrow, scheduledTime: '09:00', slotId: slotTomorrow9.id,
        status: 'PENDING', notes: 'Retirada mensal de medicamentos',
        items: { create: [{ medicineId: med1.id, quantity: 10 }, { medicineId: med4.id, quantity: 5 }] },
      },
    });
  }

  if (slotDayAfter14) {
    await prisma.appointment.create({
      data: {
        patientId: pac2.id, scheduledDate: dayAfter, scheduledTime: '14:00', slotId: slotDayAfter14.id,
        status: 'CONFIRMED', notes: 'Paciente ja orientado pelo farmaceutico',
        items: { create: [{ medicineId: med2.id, quantity: 20 }] },
      },
    });
  }

  if (slotToday14) {
    await prisma.appointment.create({
      data: {
        patientId: pac3.id, scheduledDate: today, scheduledTime: '14:00', slotId: slotToday14.id,
        status: 'PENDING', notes: 'Primeira retirada',
        items: { create: [{ medicineId: med5.id, quantity: 10 }, { medicineId: med6.id, quantity: 5 }] },
      },
    });
  }

  let apptCompleted = null;
  if (slotToday15) {
    apptCompleted = await prisma.appointment.create({
      data: {
        patientId: pac1.id, scheduledDate: today, scheduledTime: '15:00', slotId: slotToday15.id,
        status: 'COMPLETED', notes: 'Dispensação já concluída no balcão',
        dispensedByUserId: farmaceutico.id, dispensedAt: today, batchId: batch1a.id,
        items: { create: [{ medicineId: med1.id, quantity: 5, batchId: batch1a.id }] },
      },
    });
  }

  if (slotDay3_10) {
    await prisma.appointment.create({
      data: {
        patientId: pac2.id, scheduledDate: day3, scheduledTime: '10:00', slotId: slotDay3_10.id,
        status: 'CANCELLED', notes: 'Paciente desistiu da consulta/retirada',
        items: { create: [{ medicineId: med3.id, quantity: 2 }] },
      },
    });
  }

  console.log('Seed data created successfully!');
  console.log('');
  console.log('Users (5 - um por perfil):');
  console.log('   ADMIN:      admin@farmaciaescola.edu.br / admin123');
  console.log('   FARM:       luciana@farmaciaescola.edu.br / farm123');
  console.log('   MEDICO:     roberto.medico@farmaciaescola.edu.br / medico123');
  console.log('   ALUNO:      ana.aluna@farmaciaescola.edu.br / aluno123');
  console.log('   PACIENTE:   joao@email.com / paciente123');
  console.log('');
  console.log('Medicines:', 6);
  console.log('Batches:', 7, '(inclui 1 vencido, 1 critico, 1 baixo estoque, 2 lotes do mesmo medicamento p/ testar FEFO)');
  console.log('Patients:', 3, '(1 com login, 2 sem login)');
  console.log('Schedule Slots: ~20 (todos sob o unico farmaceutico)');
  console.log('Appointments: 5 (PENDING x2, CONFIRMED, COMPLETED, CANCELLED)');
  console.log('Disposals: 2 (1 por Farmaceutico, 1 por Aluno)');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    // OTIMIZADO: erro de timeout (P1008) pode ser causado por disco
    // congestionado ou volume Docker ocupado. Log detalhado para debug.
    if (e instanceof Error) {
      console.error('Stack:', e.stack);
    }
    process.exit(1);
  })
  .finally(async () => { await prisma.$disconnect(); });