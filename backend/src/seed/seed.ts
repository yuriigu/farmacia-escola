import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { Role } from '../types/enums';
import bcrypt from 'bcryptjs';

// adapter do libsql (sqlite). como o seed faz muitos deletes em cascata,
// o timeout padrao as vezes estoura em ambientes com i/o lento
// (volume docker, nfs, disco congestionado). por isso a gente trata
// timeout via retry mais abaixo, em vez de configurar aqui.
// obs: o config do libsql so aceita `url`, entao nao da pra passar
// timeout por aqui mesmo.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
});

// retry com backoff exponencial. serve pra tolerar o erro p1008
// (operation timed out / sockettimeout), que aparece quando o
// sqlite/libsql esta sob contencao (docker com volume montado,
// disco lento, muitas escritas de uma vez).
// tenta a operacao ate maxattempts vezes, com espera crescente
// entre as tentativas, e loga cada falha pra facilitar debug.
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
      // identifica se a falha foi o timeout especifico do prisma,
      // so pra deixar o log mais explicativo.
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
        // backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms (com teto de 4s).
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
  // configura o busy_timeout do sqlite. quando duas operacoes batem
  // no mesmo arquivo ao mesmo tempo, o sqlite retorna sqlite_busy.
  // com esse pragma, ele espera e retenta internamente por ate 5s
  // antes de desistir. ajuda bastante em docker/nfs.
  try {
    await prisma.$executeRaw`PRAGMA busy_timeout = 5000`;
    console.log('[seed] busy_timeout configurado para 5000ms');
  } catch (err) {
    console.warn('[seed] Falha ao configurar busy_timeout (pode ser restrito pelo adapter):', err);
  }

  // guarda de seguranca: o seed cria usuarios com senhas padrao fracas
  // (admin123, farm123, etc). rodar em producao seria perigoso, entao
  // bloqueamos por padrao. em ambiente de demonstracao, e possivel
  // liberar definindo seed_allow_insecure_passwords=true.
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SEED_ALLOW_INSECURE_PASSWORDS !== 'true') {
      throw new Error(
        'Seed bloqueado em produção: ele cria usuários com senhas padrão. Use SEED_ALLOW_INSECURE_PASSWORDS=true apenas em ambientes controlados.'
      );
    }
  }

  // limpeza geral antes de recriar os dados. a ordem respeita as fks:
  // primeiro as tabelas filhas (que apontam pra outras), depois as pais.
  // cada delete vai por retryWithBackoff pra sobreviver a p1008.
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

  // as senhas sao guardadas com hash bcrypt. o seed usa senhas
  // conhecidas pra facilitar o login em ambiente de desenvolvimento.
  const adminPass = await bcrypt.hash('admin123', 10);
  const farmPass = await bcrypt.hash('farm123', 10);
  const medPass = await bcrypt.hash('medico123', 10);
  const alunoPass = await bcrypt.hash('aluno123', 10);
  const pacPass = await bcrypt.hash('paciente123', 10);

  // cria um usuario pra cada perfil do sistema, cobrindo os papeis
  // usados nos testes manuais e automatizados.
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

  // tres pacientes no seed. so o joao tem usuario de login vinculado,
  // pra testar o fluxo do paciente que acessa o proprio cadastro.
  const pac1 = await prisma.patient.create({
    data: { name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 99999-0001', birthDate: new Date('1990-05-15'), address: 'Rua A, 100, São Paulo', userId: pacUser.id },
  });

  const pac2 = await prisma.patient.create({
    data: { name: 'Maria Oliveira', cpf: '987.654.321-00', phone: '(11) 99999-0002', birthDate: new Date('1985-11-20'), address: 'Av. B, 200, São Paulo' },
  });

  const pac3 = await prisma.patient.create({
    data: { name: 'Carlos Santos', cpf: '456.789.123-00', phone: '(11) 99999-0003', birthDate: new Date('1975-03-10') },
  });

  // catalogo de medicamentos cobrindo categorias variadas, com
  // descricao acessivel pra testar a exibicao no front.
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

  // lotes do paracetamol: dois com validades bem diferentes,
  // pra exercitar o fefo (first expired, first out) na dispensacao.
  const batch1a = await prisma.stockBatch.create({
    data: { medicineId: med1.id, batchNumber: 'LOT-2024-001A', currentQuantity: 15, expirationDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()) }, // vencimento próximo
  });
  const batch1b = await prisma.stockBatch.create({
    data: { medicineId: med1.id, batchNumber: 'LOT-2024-001B', currentQuantity: 150, expirationDate: new Date(now.getFullYear() + 1, 5, 15) }, // vencimento distante
  });

  const batch2 = await prisma.stockBatch.create({
    data: { medicineId: med2.id, batchNumber: 'LOT-2024-002', currentQuantity: 80, expirationDate: new Date(now.getFullYear() + 1, 8, 20) },
  });

  // esse lote ja nasce vencido, pra testar o alerta de validade.
  const batch3 = await prisma.stockBatch.create({
    data: { medicineId: med3.id, batchNumber: 'LOT-2024-003', currentQuantity: 45, expirationDate: new Date(now.getFullYear() - 1, 2, 10) }, // já vencido
  });

  const batch4 = await prisma.stockBatch.create({
    data: { medicineId: med4.id, batchNumber: 'LOT-2024-004', currentQuantity: 200, expirationDate: new Date(now.getFullYear() + 1, 11, 30) },
  });

  const batch5 = await prisma.stockBatch.create({
    data: { medicineId: med5.id, batchNumber: 'LOT-2024-005', currentQuantity: 60, expirationDate: new Date(now.getFullYear() + 1, 4, 25) },
  });

  // esse lote tem saldo baixo de proposito, pra exercitar o card critico.
  const batch6 = await prisma.stockBatch.create({
    data: { medicineId: med6.id, batchNumber: 'LOT-2024-006', currentQuantity: 3, expirationDate: new Date(now.getFullYear() + 1, 7, 18) }, // estoque baixo
  });

  // dois descartes: um feito pelo farmaceutico (lote vencido) e um
  // pelo aluno (embalagem danificada). cobre os dois papeis que
  // costumam registrar descarte.
  await prisma.disposal.create({
    data: { batchId: batch3.id, userId: farmaceutico.id, quantity: 5, reason: 'Medicamento Vencido' },
  });

  await prisma.disposal.create({
    data: { batchId: batch1a.id, userId: aluno.id, quantity: 2, reason: 'Embalagem Danificada' },
  });

  // monta a agenda dos proximos dias. como o seed gera os dias
  // dinamicamente a partir de hoje, o dataset nao fica preso a
  // uma data fixa e continua util em qualquer execucao futura.
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

  // dois slots no proprio dia, pra dar massa imediata nos testes.
  const todaySlots = ['14:00', '15:00'];
  for (const ts of todaySlots) {
    await prisma.scheduleSlot.create({
      data: { date: today, timeSlot: ts, maxCapacity: 4, active: true, assignedToId: farmaceutico.id },
    });
  }

  // busca os slots recem-criados pra usar nos agendamentos abaixo.
  const slotTomorrow9 = await prisma.scheduleSlot.findFirst({ where: { date: tomorrow, timeSlot: '09:00' } });
  const slotDayAfter14 = await prisma.scheduleSlot.findFirst({ where: { date: dayAfter, timeSlot: '14:00' } });
  const slotToday14 = await prisma.scheduleSlot.findFirst({ where: { date: today, timeSlot: '14:00' } });
  const slotToday15 = await prisma.scheduleSlot.findFirst({ where: { date: today, timeSlot: '15:00' } });
  const slotDay3_10 = await prisma.scheduleSlot.findFirst({ where: { date: day3, timeSlot: '10:00' } });

  // agendamentos cobrindo os quatro status possiveis: pending,
  // confirmed, completed e cancelled. assim da pra validar as
  // transicoes de status e os filtros da tela de consultas.
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

  // consulta ja finalizada, com dados de dispensacao preenchidos.
  // serve pra testar os fluxos que dependem de consulta completed.
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

  // resumo final do que foi criado, com as credenciais de teste.
  // ajuda quem acabou de rodar o seed a saber o que usar pra logar.
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
    // erro de timeout (p1008) costuma vir de disco congestionado ou
    // volume docker ocupado. logamos o stack inteiro pra ajudar o debug.
    if (e instanceof Error) {
      console.error('Stack:', e.stack);
    }
    process.exit(1);
  })
  .finally(async () => { await prisma.$disconnect(); });