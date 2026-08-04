import { PrismaClient } from '@prisma/client';
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
        role: 'ADMIN',
        active: true,
      },
    });

    console.log('✅ Usuário Admin criado com sucesso!');
    console.log('📧 Email: admin@farmaciaescola.edu.br');
    console.log('🔑 Senha: admin123');
  } else {
    console.log('⚡ Usuário Admin já existe no banco.');
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