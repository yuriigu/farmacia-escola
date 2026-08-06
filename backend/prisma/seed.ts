import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@farmaciaescola.edu.br';

  // 1. Verifica se o admin já existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingAdmin) {
    // 2. Criptografa a senha 'admin123'
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 3. Cria o usuário administrador
    await prisma.user.create({
      data: {
        name: 'Administrador do Sistema',
        email: email,
        password: passwordHash,
        role: Role.ADMIN,
        active: true,
      },
    });

    console.log('✅ Usuário Admin criado com sucesso!');
    console.log('📧 Email: admin@farmaciaescola.edu.br');
    console.log('🔑 Senha: admin123');
  } else {
    console.log('⚡ Usuário Admin já existe no banco.');
  }

  // 4. Cria um paciente de teste
  const patientEmail = 'paciente@teste.com';
  const existingPatientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
  });

  if (!existingPatientUser) {
    const hashedPassword = await bcrypt.hash('senha123', 10);

    await prisma.user.create({
      data: {
        name: 'João Paciente',
        email: patientEmail,
        password: hashedPassword,
        role: Role.PACIENTE,
        active: true,
        patient: {
          create: {
            name: 'João Paciente',
            cpf: '11122233344',
            phone: '44999999999',
            birthDate: new Date('1990-01-01'),
            address: 'Rua Exemplo, 123, Campo Mourão - PR'
          }
        }
      }
    });

    console.log('✅ Paciente de teste criado com sucesso!');
    console.log('📧 Email: paciente@teste.com');
    console.log('🔑 Senha: senha123');
  } else {
    console.log('⚡ Paciente de teste já existe no banco.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });