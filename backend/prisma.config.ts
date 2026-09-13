// Configuração do Prisma CLI (padrão a partir do Prisma 7).
// O CLI não carrega mais o .env automaticamente: o dotenv faz isso aqui.
// A string de conexão saiu do bloco `datasource` do schema.prisma
// e agora vive somente neste arquivo.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
