# Farmácia Escola — Backend

API RESTful responsável pelo núcleo transacional da plataforma Farmácia Escola, desenvolvida com Node.js, Express, TypeScript e Prisma. O backend centraliza as regras de negócio, persistência de dados, controle de estoque, agendamentos, dispensações, descartes, auditoria e autenticação baseada em papéis (RBAC).

## Sobre o Projeto

O backend foi desenvolvido para garantir a integridade dos dados e aplicar as regras de negócio relacionadas às operações da Farmácia Escola.

### Principais Características

* Gestão de medicamentos e lotes de estoque
* Controle de quantidade disponível por lote
* Alertas relacionados à validade dos medicamentos
* Dispensação de medicamentos com baixa automática no estoque
* Registro do profissional responsável pela dispensação
* Controle de descartes por avaria, vencimento ou contaminação
* Possibilidade de reversão de descartes
* Gestão de horários e agendamentos
* Autenticação utilizando tokens JWT
* Controle de acesso baseado em papéis (RBAC)
* Registro de atividades para auditoria
* Integridade e segurança das operações de estoque

## Stack Tecnológica

### Backend

* Node.js 18+
* Express 4
* TypeScript 5
* Prisma ORM 6
* SQLite para desenvolvimento
* PostgreSQL para produção
* JSON Web Token (JWT)
* bcryptjs
* CORS
* ts-node
* Nodemon

## Pré-requisitos

* Node.js 18 ou superior
* npm 9 ou superior
* Git
* PostgreSQL, caso seja utilizado como banco de produção

## Instalação

### Clone o repositório

```bash
git clone https://github.com/yuriigu/farmacia-escola.git
cd farmacia-escola
```

### Acesse a pasta do backend

```bash
cd backend
```

### Instale as dependências

```bash
npm install
```

### Configure as variáveis de ambiente

Crie um arquivo `.env` no diretório `backend/`:

```env
# Banco de dados (SQLite local para dev ou string PostgreSQL)
DATABASE_URL="file:./prisma/dev.db"

# Segredo utilizado na assinatura dos tokens JWT
JWT_SECRET="farmacia-escola-secret-key-2024"

# Porta do servidor
PORT=3001

# URL do frontend para CORS
FRONTEND_URL="http://localhost:3000"
```

### Configure o banco de dados

Sincronize o schema do Prisma:

```bash
npm run db:push
```

Gere o Prisma Client, caso necessário:

```bash
npm run db:generate
```

### Popule o banco de dados

Para inserir os dados iniciais de medicamentos, lotes, agendamentos e usuários de teste:

```bash
npm run db:seed
```

## Executando o Projeto

### Desenvolvimento

Inicie o servidor com hot-reload:

```bash
npm run dev
```

O backend será executado na porta configurada no arquivo `.env`.

### Produção

Compile o projeto:

```bash
npm run build
```

Depois, inicie o servidor:

```bash
npm run start
```

## Scripts Disponíveis

| Script                | Descrição                                                   |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | Inicia o servidor em modo de desenvolvimento com hot-reload |
| `npm run build`       | Compila o TypeScript e gera o Prisma Client                 |
| `npm run start`       | Inicia o servidor de produção compilado                     |
| `npm run db:push`     | Sincroniza o schema do Prisma com o banco                   |
| `npm run db:migrate`  | Cria e executa migrações do Prisma                          |
| `npm run db:generate` | Gera o Prisma Client                                        |
| `npm run db:seed`     | Popula o banco com dados iniciais                           |

## Funcionalidades

### Autenticação e Autorização

* Autenticação baseada em JWT
* Controle de acesso baseado em papéis (RBAC)
* Perfis disponíveis:

  * `ADMIN`
  * `FARMACEUTICO`
  * `MEDICO`
  * `ALUNO`
  * `PACIENTE`
* Proteção de rotas sensíveis
* Hashing de senhas utilizando bcryptjs

### Gestão de Medicamentos

* Cadastro de medicamentos
* Consulta de medicamentos
* Atualização de informações
* Exclusão controlada
* Informações sobre princípio ativo, dosagem e categoria
* Descrição acessível para pacientes

### Gestão de Estoque

* Cadastro de lotes
* Controle de quantidade disponível
* Controle de validade
* Consulta de lotes por medicamento
* Atualização de informações dos lotes
* Proteção contra retirada superior ao estoque disponível

### Dispensação

* Registro de retiradas
* Baixa automática no lote de origem
* Associação entre paciente, medicamento e lote
* Registro do profissional responsável
* Cancelamento com estorno da quantidade

### Descartes

* Registro de medicamentos descartados
* Motivos de descarte
* Baixa no estoque
* Histórico de descartes
* Reversão de descartes realizados indevidamente

### Agendamentos

* Criação de solicitações de atendimento
* Gestão de faixas de horários
* Controle de capacidade
* Associação de medicamentos ao agendamento
* Atualização do status do atendimento
* Cancelamento de agendamentos

### Auditoria

* Registro de operações realizadas no sistema
* Histórico de login
* Registro de cadastros, alterações e exclusões
* Consulta paginada dos logs de atividade

## API Endpoints

A API Express disponibiliza os seguintes endpoints sob o prefixo `/api` (com healthcheck `/health`):

### Autenticação & Perfil

```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
GET  /api/auth/profile
PUT  /api/auth/profile
```

### Medicamentos

```http
GET    /api/medicines
GET    /api/medicines/:id
POST   /api/medicines
PUT    /api/medicines/:id
DELETE /api/medicines/:id
```

### Lotes de Estoque

```http
GET    /api/batches
GET    /api/batches/:id
POST   /api/batches
PUT    /api/batches/:id
DELETE /api/batches/:id
```

### Grade de Horários

```http
GET    /api/schedule-slots
GET    /api/schedule-slots/:id
POST   /api/schedule-slots
PUT    /api/schedule-slots/:id
DELETE /api/schedule-slots/:id
```

### Agendamentos

```http
GET    /api/appointments
GET    /api/appointments/:id
POST   /api/appointments
PUT    /api/appointments/:id
PUT    /api/appointments/:id/status
DELETE /api/appointments/:id
```

### Dispensações (Retiradas)

```http
GET    /api/withdrawals
GET    /api/withdrawals/:id
POST   /api/withdrawals
PUT    /api/withdrawals/:id
DELETE /api/withdrawals/:id
```

### Descartes

```http
GET    /api/disposals
GET    /api/disposals/:id
POST   /api/disposals
PUT    /api/disposals/:id
DELETE /api/disposals/:id
POST   /api/disposals/:id/revert
```

### Pacientes

```http
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
```

### Usuários (Administração)

```http
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/toggle-active
```

### Auditoria & Sistema

```http
GET /api/activity-logs?page=1&limit=20
GET /api/activity-logs/:id
GET /health
```

## Modelo de Dados

O banco de dados utiliza os seguintes principais modelos:

| Modelo            | Descrição                                   |
| ----------------- | ------------------------------------------- |
| `User`            | Usuários, operadores e pacientes do sistema |
| `Patient`         | Dados cadastrais dos pacientes              |
| `Medicine`        | Cadastro dos medicamentos                   |
| `StockBatch`      | Lotes físicos e quantidades disponíveis     |
| `Withdrawal`      | Registro das dispensações                   |
| `WithdrawalItem`  | Itens associados às dispensações            |
| `Disposal`        | Registro de descartes                       |
| `ScheduleSlot`    | Faixas de horários disponíveis              |
| `Appointment`     | Agendamentos de atendimento                 |
| `AppointmentItem` | Medicamentos solicitados no agendamento     |
| `ActivityLog`     | Registro de ações para auditoria            |

## Padrões de Desenvolvimento

* Arquitetura organizada em camadas
* Separação entre regras de negócio e acesso a dados
* Prisma como camada de persistência
* Autenticação baseada em JWT
* Controle de acesso baseado em RBAC
* Validação das operações de estoque
* Tratamento seguro de operações de estorno
* Registro de ações relevantes para auditoria

## Regras de Negócio e Segurança

1. Nenhuma dispensação ou descarte pode ultrapassar o saldo disponível do lote.
2. O cancelamento de uma dispensação deve restaurar a quantidade ao lote original.
3. A reversão de um descarte deve restaurar o saldo correspondente.
4. Endpoints protegidos exigem autenticação por Bearer Token.
5. As senhas são armazenadas utilizando hashing com bcryptjs.
6. Operações relevantes são registradas na trilha de auditoria.
7. Operações administrativas possuem restrições de acesso conforme o papel do usuário.

## Estrutura do Projeto

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   ├── ActivityLogController.ts
│   │   ├── AppointmentController.ts
│   │   ├── AuthController.ts
│   │   ├── BatchController.ts
│   │   ├── DisposalController.ts
│   │   ├── MedicineController.ts
│   │   ├── PatientController.ts
│   │   ├── ScheduleSlotController.ts
│   │   ├── UserController.ts
│   │   └── WithdrawalController.ts
│   ├── middlewares/
│   │   ├── authMiddleware.ts
│   │   ├── errorMiddleware.ts
│   │   └── roleMiddleware.ts
│   ├── repositories/
│   ├── routes/
│   │   ├── activityLogRoutes.ts
│   │   ├── appointmentRoutes.ts
│   │   ├── authRoutes.ts
│   │   ├── batchRoutes.ts
│   │   ├── disposalRoutes.ts
│   │   ├── medicineRoutes.ts
│   │   ├── patientRoutes.ts
│   │   ├── scheduleSlotRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── withdrawalRoutes.ts
│   │   └── index.ts
│   ├── seed/
│   │   └── seed.ts
│   ├── services/
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── prisma.ts
│   └── index.ts
├── Caddyfile
├── package.json
├── tsconfig.json
└── README.md
```

## Suporte

Para reportar problemas ou solicitar melhorias, utilize o sistema de Issues do GitHub.

## Autor

**Yuri Simplicio**

* GitHub: [@yuriigu](https://github.com/yuriigu)
* E-mail: `yurigustavo415@gmail.com`
