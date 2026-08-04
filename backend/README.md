# Farmácia Escola — Backend API

API REST de gestão farmacêutica: controle de estoque, retiradas por paciente, descartes de lotes e autenticação por perfil.

## Tecnologias

| Tecnologia | Função |
|---|---|
| **Node.js 22 + Express 5** | Servidor HTTP |
| **TypeScript 7** | Linguagem principal |
| **MySQL 8** | Banco de dados relacional |
| **Prisma 5** | ORM e migrations |
| **jsonwebtoken 9** | Autenticação JWT |
| **bcryptjs 3** | Hash de senhas |
| **zod 4** | Validação de dados |
| **Docker / Docker Compose** | Containerização da infraestrutura |

## Estrutura do Projeto

```
backend/
  prisma/
    schema.prisma          # Definição do banco e relacionamentos
    seed.ts                # Seed do usuário admin padrão
  src/
    middlewares/
      auth.middleware.ts   # Validação JWT + injeção de user no contexto
    routes/
      auth.routes.ts       # Login e perfil autenticado
      medicine.routes.ts   # CRUD de medicamentos
      batch.routes.ts      # Lotes e alertas de estoque
      withdrawal.routes.ts # Retiradas por paciente
      disposal.routes.ts   # Descartes de lotes
    lib/
      prisma.ts            # Instância do Prisma Client
      formatters.ts        # Formatação de respostas da API
    server.ts              # Configuração do app e registro de rotas
```

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 22+

## Como Rodar

### 1. Suba o banco de dados

```bash
docker compose up -d
```

Inicia MySQL 8 na porta `3306` e Adminer (interface web) na porta `8080`.

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Default | Descrição |
|---|---|---|
| `DATABASE_URL` | `mysql://farmaceutico:farmapassword@localhost:3306/farmacia_escola` | Conexão MySQL |
| `JWT_SECRET` | `farmacia_escola_secret_key_2026_tcc` | Chave de assinatura JWT |
| `PORT` | `3001` | Porta do servidor HTTP |

### 3. Execute as migrations

```bash
npx prisma migrate dev
```

### 4. Popule o banco com o usuário admin

```bash
npm run seed
```

| Campo | Valor |
|-------|-------|
| E-mail | `admin@farmaciaescola.edu.br` |
| Senha | `admin123` |
| Perfil | `ADMIN` |

### 5. Inicie a aplicação

```bash
npm run dev
```

A API estará disponível em `http://localhost:3001`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com hot-reload (tsx watch) |
| `npm run seed` | Popular banco com usuário admin padrão |

## Banco de Dados

| Entidade | Descrição |
|----------|-----------|
| `User` | Usuários do sistema (ADMIN / FARMACEUTICO / ALUNO) |
| `Patient` | Pacientes atendidos |
| `Medicine` | Catálogo de medicamentos |
| `StockBatch` | Lotes em estoque com quantidade e validade |
| `Withdrawal` | Registro de retiradas por paciente |
| `WithdrawalItem` | Itens de cada retirada — relação M:N entre Withdrawal e StockBatch |
| `Disposal` | Descartes de lotes com motivo e responsável |

## Endpoints

### Health Check

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Status da API |

### Autenticação — `/auth`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/login` | Login e geração de token JWT |
| `GET` | `/auth/me` | Dados do usuário autenticado *(protegido)* |

### Medicamentos — `/medicines`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/medicines` | Cadastrar medicamento *(protegido)* |
| `GET` | `/medicines` | Listar medicamentos |
| `GET` | `/medicines/:id` | Detalhes do medicamento |
| `DELETE` | `/medicines/:id` | Remover medicamento *(protegido)* |

### Lotes — `/batches`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/batches` | Registrar novo lote *(protegido)* |
| `GET` | `/batches` | Listar lotes *(protegido)* |
| `GET` | `/batches/alerts` | Lotes com estoque baixo ou próximos ao vencimento |

### Retiradas — `/withdrawals`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/withdrawals` | Registrar retirada com baixa automática no estoque *(protegido)* |
| `GET` | `/withdrawals` | Histórico de retiradas |

### Descartes — `/disposals`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/disposals` | Registrar descarte com baixa no estoque *(protegido)* |
| `GET` | `/disposals` | Histórico de descartes |

## Middleware

Rotas marcadas como *protegido* exigem token JWT no header `Authorization: Bearer <token>`.

O middleware (`auth.middleware.ts`) valida o token, extrai `id`, `name`, `email` e `role`, e injeta os dados no contexto da requisição.

## Licença

MIT
