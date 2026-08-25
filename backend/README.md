# Farmácia Escola API - Backend

API RESTful em Node.js, Express e TypeScript desenvolvida para gerenciar o núcleo transacional do sistema **Farmácia Escola**, fornecendo controle de estoque farmacêutico por lote, agendamento de atendimentos, histórico de dispensações a pacientes, auditoria regulatória e controle de acesso baseado em papéis (RBAC).

---

## 🎯 Sobre o Backend

O backend é responsável por garantir a integridade dos dados e aplicar as regras farmacêuticas e sanitárias da instituição:
- **Gestão de Medicamentos & Lotes**: Cadastro de especialidades farmacêuticas com controle estrito de lotes (`StockBatch`), saldo fracionado/unitário e alertas de validade.
- **Dispensação de Medicamentos (`Withdrawals`)**: Processamento de retiradas com débito automático no lote de origem e registro do profissional responsável.
- **Descarte Motivado & Reversão (`Disposals`)**: Baixa controlada por avaria, vencimento ou contaminação, com histórico e possibilidade de reversão motivada.
- **Escala de Atendimento & Agendamentos**: Gestão de faixas de horários (`ScheduleSlot`) e agendamentos de retiradas vinculados a múltiplos itens de medicamentos.
- **Autenticação & Autorização (RBAC)**: Emissão e validação de tokens JWT, protegendo rotas sensíveis com controle de permissões por perfil (`ADMIN`, `FARMACEUTICO`, `MEDICO`, `ALUNO`, `PACIENTE`).
- **Trilha de Auditoria (`ActivityLog`)**: Registro indelével de operações de login, cadastro, edição e exclusão de registros.

---

## 🚀 Tecnologias e Bibliotecas

- **Ambiente de Execução**: [Node.js](https://nodejs.org/) (v18+)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) v5
- **Framework Web**: [Express.js](https://expressjs.com/) v4
- **ORM**: [Prisma ORM](https://www.prisma.io/) v6
- **Banco de Dados**: SQLite (desenvolvimento padrão) / PostgreSQL (produção)
- **Autenticação**: [JSON Web Token (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **CORS**: `cors`
- **Desenvolvimento & Hot Reload**: `ts-node` e `nodemon`

---

## 📋 Pré-requisitos

- **Node.js**: `v18.0.0` ou superior
- **npm**: `v9.0.0` ou superior
- (Opcional) Instância do **PostgreSQL** caso deseje utilizar banco relacional externo em vez do SQLite local.

---

## 🔧 Instalação e Configuração

### 1. Acessar a pasta do backend
```bash
cd backend
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` no diretório `backend/` (ou utilize o `.env` da raiz):
```env
# URL do banco de dados (SQLite local por padrão)
DATABASE_URL="file:./prisma/dev.db"

# Segredo de assinatura JWT
JWT_SECRET="farmacia-escola-secret-key-2024"

# Porta do servidor Express
PORT=3001
```

### 4. Configurar e popular o banco de dados
Gere os tipos do Prisma e aplique o schema:
```bash
npm run db:push
```

Para popular o banco com o catálogo de medicamentos, lotes, agendamentos e usuários de teste:
```bash
npm run db:seed
```

---

## 🚀 Scripts Disponíveis

| Comando | Descrição |
|:---|:---|
| `npm run dev` | Inicia o servidor em modo de desenvolvimento com hot-reload (`nodemon` + `ts-node`) |
| `npm run build` | Compila o código TypeScript para JavaScript na pasta `dist/` e gera o Prisma Client |
| `npm run start` | Executa o servidor de produção compilado a partir de `dist/index.js` |
| `npm run db:push` | Sincroniza o schema do Prisma diretamente com o banco de dados |
| `npm run db:migrate` | Cria e executa migrações estruturadas do Prisma |
| `npm run db:generate` | Gera o cliente tipado do Prisma (`@prisma/client`) |
| `npm run db:seed` | Executa o script de carga inicial de dados (`src/seed/seed.ts`) |

---

## 📚 Endpoints da API

Todas as rotas são prefixadas por `/backend` (ou na raiz da API dependendo da porta configurada).

### 🔐 1. Autenticação e Usuários (`/backend/auth` & `/backend/users`)

#### Login de Usuário
```http
POST /backend/auth/login
Content-Type: application/json

{
  "email": "admin@farmaciaescola.edu.br",
  "password": "admin123"
}
```
**Resposta (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin Sistema",
    "email": "admin@farmaciaescola.edu.br",
    "role": "ADMIN",
    "active": true
  }
}
```

#### Cadastro de Paciente
```http
POST /backend/auth/register
Content-Type: application/json

{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "senhaSegura123",
  "cpf": "123.456.789-00",
  "phone": "(11) 98888-7777",
  "birthDate": "1988-04-12",
  "address": "Rua das Oliveiras, 45"
}
```

#### Obter Dados do Usuário Logado
```http
GET /backend/auth/me
Authorization: Bearer <seu_token_jwt>
```

#### Atualizar Perfil / Alterar Senha
```http
PUT /backend/auth/profile
Authorization: Bearer <seu_token_jwt>
Content-Type: application/json

{
  "name": "Maria Silva Santos",
  "phone": "(11) 99999-8888",
  "newPassword": "novaSenhaForte123"
}
```

---

### 💊 2. Medicamentos (`/backend/medicines`)

- `GET /backend/medicines` - Lista todos os medicamentos cadastrados com contagem de lotes e saldo total em estoque.
- `GET /backend/medicines/:id` - Retorna os detalhes de um medicamento específico e seus lotes ativos.
- `POST /backend/medicines` - Cria um novo medicamento (*Requer ADMIN ou FARMACEUTICO*).
- `PUT /backend/medicines/:id` - Atualiza informações do medicamento.
- `DELETE /backend/medicines/:id` - Remove o medicamento do catálogo (*Requer ADMIN*).

**Exemplo de Payload para Cadastro:**
```json
{
  "name": "Dipirona Monoidratada",
  "activeIngredient": "Dipirona sódica",
  "dosage": "500mg/mL - Gotas 20mL",
  "accessibleDesc": "Analgésico e antitérmico para dores e febre. Ingerir a quantidade de gotas recomendada em água.",
  "category": "analgesico"
}
```

---

### 📦 3. Lotes de Estoque (`/backend/batches`)

- `GET /backend/batches` - Lista lotes cadastrados (suporta filtro por query parameter: `?medicineId=1`).
- `POST /backend/batches` - Registra a entrada de um novo lote recebido.
- `PUT /backend/batches/:id` - Atualiza informações de lote (quantidade, número ou data de validade).
- `DELETE /backend/batches/:id` - Exclui um lote (*Requer ADMIN*).

**Exemplo de Payload para Entrada de Lote:**
```json
{
  "medicineId": 1,
  "batchNumber": "LOT-2024-550",
  "currentQuantity": 120,
  "expirationDate": "2026-11-30"
}
```

---

### 📅 4. Escala e Agendamentos (`/backend/schedule-slots` & `/backend/appointments`)

#### Grade de Horários (`/backend/schedule-slots`)
- `GET /backend/schedule-slots` - Lista faixas de horários e capacidade restante.
- `POST /backend/schedule-slots` - Cadastra uma nova faixa horária (*Requer ADMIN ou FARMACEUTICO*).
- `DELETE /backend/schedule-slots/:id` - Desativa uma faixa de horário.

#### Agendamentos de Retirada (`/backend/appointments`)
- `GET /backend/appointments` - Lista agendamentos cadastrados com dados do paciente e medicamentos solicitados.
- `POST /backend/appointments` - Cria uma nova solicitação de agendamento.
- `PUT /backend/appointments/:id` - Atualiza o status do agendamento (`CONFIRMED`, `COMPLETED`, `CANCELLED`) e notas técnicas.
- `DELETE /backend/appointments/:id` - Cancela o agendamento.

**Exemplo de Criação de Agendamento:**
```json
{
  "patientId": 1,
  "scheduledDate": "2026-09-10",
  "scheduledTime": "09:00",
  "slotId": 2,
  "notes": "Paciente hipertenso. Retirada de medicação contínua.",
  "items": [
    {
      "medicineId": 1,
      "quantity": 30
    }
  ]
}
```

---

### 📤 5. Dispensação de Medicamentos (`/backend/withdrawals`)

- `GET /backend/withdrawals` - Retorna o histórico de todas as retiradas efetuadas, com paciente, medicamento, lote, data e profissional responsável.
- `POST /backend/withdrawals` - Realiza a baixa imediata no estoque do lote selecionado e registra a dispensação.
- `DELETE /backend/withdrawals/:id` - Cancela a retirada e estorna automaticamente a quantidade para o lote de origem.

**Exemplo de Registro de Retirada:**
```json
{
  "patientName": "João Silva",
  "patientCpf": "123.456.789-00",
  "batchId": 1,
  "quantity": 10,
  "notes": "Receita médica apresentada e retida. Paciente orientado sobre horários de administração."
}
```

---

### 🗑️ 6. Descarte de Medicamentos (`/backend/disposals`)

- `GET /backend/disposals` - Histórico de descartes realizados.
- `POST /backend/disposals` - Registra descarte de unidades com motivo declarado (baixa do lote).
- `POST /backend/disposals/:id/revert` - Reverte um descarte cadastrado indevidamente, devolvendo o saldo ao lote.

**Exemplo de Registro de Descarte:**
```json
{
  "batchId": 2,
  "quantity": 4,
  "reason": "Frascos avariados no transporte"
}
```

---

### 📜 7. Logs de Auditoria (`/backend/activity-logs`)

- `GET /backend/activity-logs?page=1&limit=20` - Retorna trilha paginada de ações realizadas no sistema.

---

## 🗄️ Modelo de Dados (Prisma Schema)

O banco de dados estrutura os seguintes modelos e relacionamentos:

- **User**: Representa os operadores e pacientes do sistema, com credenciais e papel (`Role`).
- **Patient**: Dados cadastrais do paciente atendido (`cpf`, `birthDate`, `phone`, `address`).
- **Medicine**: Registro base do medicamento (`name`, `dosage`, `activeIngredient`, `accessibleDesc`, `category`).
- **StockBatch**: Lote físico com quantidade atual (`currentQuantity`), data de validade (`expirationDate`) e número de lote.
- **Withdrawal** & **WithdrawalItem**: Registro de dispensação com quantidade, paciente e lote.
- **Disposal**: Registro de descarte motivado com flag `reverted`.
- **ScheduleSlot**: Faixa de horário com capacidade máxima (`maxCapacity`) e preceptor designado.
- **Appointment** & **AppointmentItem**: Agendamento de atendimento com medicamentos e status de evolução.
- **ActivityLog**: Histórico de ações e eventos de sistema para auditoria técnica.

---

## 🔒 Regras de Negócio e Segurança

1. **Proteção de Estoque**: Nenhuma operação de dispensação ou descarte pode processar quantidade superior ao saldo existente no lote (`currentQuantity >= requestedQuantity`).
2. **Estorno Seguro**: O cancelamento de dispensação ou a reversão de descarte incrementa atomicamente o saldo do lote original.
3. **Autenticação Bearer**: Endpoints protegidos exigem o header `Authorization: Bearer <token_jwt>`.
4. **Hashing de Senhas**: As senhas são criptografadas com `bcryptjs` utilizando salt rounds seguro antes do armazenamento.
