# Farmácia Escola

Sistema de gestão farmacêutica universitária desenvolvido para o gerenciamento integrado de uma farmácia escola, contemplando controle de estoque, rastreabilidade de lotes, agendamento de retiradas, dispensação supervisionada de medicamentos, descarte motivado e trilha de auditoria para conformidade regulatória.

## Sobre o Projeto

O **Farmácia Escola** é um sistema web full-stack desenvolvido para apoiar a operação de farmácias universitárias e comunitárias integradas ao ensino superior em saúde.

A plataforma funciona como uma ponte digital entre estudantes de graduação em Farmácia, farmacêuticos preceptores, médicos e pacientes da comunidade externa atendida pelo serviço.

O sistema foi projetado para centralizar as principais operações da farmácia, proporcionando maior controle sobre medicamentos, atendimentos, dispensações e usuários, além de oferecer recursos de auditoria e rastreabilidade.

### Objetivos

* **Gestão e Farmacêuticos:** assegurar o controle de entradas, saídas, prazos de validade e saldos de medicamentos, reduzindo perdas e contribuindo para a conformidade sanitária.
* **Estudantes:** oferecer um ambiente de aprendizado supervisionado, permitindo simular e acompanhar rotinas profissionais relacionadas à dispensação, orientação farmacoterapêutica e conferência de prescrições.
* **Pacientes:** proporcionar autonomia e comodidade por meio da consulta de medicamentos disponíveis, informações acessíveis e agendamento de horários para retirada presencial.

### Principais Características

* Controle de estoque e rastreabilidade por lotes
* Gerenciamento de datas de validade
* Alertas para medicamentos próximos do vencimento
* Agendamento prévio de retiradas
* Controle de capacidade por faixa horária
* Dispensação supervisionada de medicamentos
* Registro de descartes motivados
* Possibilidade de reversão de descartes
* Histórico de retiradas por paciente
* Controle de acesso baseado em papéis (RBAC)
* Trilha de auditoria das operações
* Catálogo de medicamentos com linguagem acessível
* Interface web responsiva

## Problemas Resolvidos

### Redução de Filas e Aglomerações

O sistema distribui o fluxo de atendimento por meio de agendamentos prévios, utilizando faixas horárias com controle de capacidade máxima.

### Prevenção de Perdas por Vencimento

A rastreabilidade individual dos lotes permite identificar medicamentos válidos, próximos do vencimento ou vencidos, possibilitando ações preventivas para reduzir perdas.

### Comunicação Clara em Saúde

O catálogo disponibiliza descrições acessíveis dos medicamentos, utilizando linguagem direcionada a pacientes e usuários não especializados.

### Rastreabilidade e Governança

As operações relevantes são registradas em uma trilha de auditoria, permitindo identificar ações de login, dispensação, descarte e alterações cadastrais.

## Funcionalidades

### Gestão de Estoque e Lotes

* Cadastro de medicamentos
* Registro de nome comercial
* Controle de princípio ativo
* Cadastro de dosagem e categoria
* Orientações acessíveis sobre medicamentos
* Controle de múltiplos lotes por medicamento
* Registro do código do lote
* Controle da quantidade disponível
* Registro da data de recebimento
* Controle da data de expiração
* Identificação de lotes próximos ao vencimento
* Identificação de lotes vencidos

### Grade de Horários e Agendamentos

* Criação de faixas de atendimento
* Definição de data e horário
* Controle de capacidade máxima
* Associação de farmacêutico responsável
* Agendamento por pacientes
* Associação de múltiplos medicamentos ao agendamento
* Acompanhamento do ciclo de vida do agendamento

Os agendamentos podem apresentar os seguintes estados:

* `PENDING` — Pendente
* `CONFIRMED` — Confirmado
* `COMPLETED` — Concluído
* `CANCELLED` — Cancelado

### Dispensação e Gestão de Pacientes

* Cadastro de pacientes
* Registro de CPF
* Data de nascimento
* Telefone
* Endereço
* Registro de dispensações
* Baixa automática da quantidade retirada no lote
* Histórico de retiradas
* Consulta de informações relacionadas ao paciente

### Descartes

* Registro de descartes motivados
* Controle de quantidade descartada
* Registro do motivo do descarte
* Baixa da quantidade correspondente no estoque
* Histórico de descartes
* Reversão justificada de descartes

### Controle de Acesso (RBAC)

O sistema possui cinco papéis principais:

| Papel          | Descrição                                                                             |
| -------------- | ------------------------------------------------------------------------------------- |
| `ADMIN`        | Gestão da aplicação, usuários, configurações globais e auditoria                      |
| `FARMACEUTICO` | Responsabilidade técnica, estoque, validação de receitas, dispensações e agendamentos |
| `MEDICO`       | Consulta de disponibilidade de medicamentos e encaminhamentos clínicos                |
| `ALUNO`        | Atendimento supervisionado, consulta ao estoque e registro assistido de dispensações  |
| `PACIENTE`     | Consulta ao catálogo, histórico próprio e solicitação de agendamentos                 |

## Stack Tecnológica

### Frontend

* **Framework:** Next.js 16 com App Router
* **Biblioteca:** React 19
* **Linguagem:** TypeScript 5
* **Estilização:** Tailwind CSS v4
* **Componentes:** Radix UI e Shadcn UI
* **Gerenciamento de dados:** TanStack React Query v5
* **Gerenciamento de estado:** Zustand v5
* **Formulários:** React Hook Form
* **Validação:** Zod
* **Ícones:** Lucide React
* **Notificações:** Sonner
* **Gráficos:** Recharts

### Backend

* **Runtime:** Node.js 18+
* **Framework HTTP:** Express.js 4
* **Linguagem:** TypeScript 5
* **Arquitetura:** Controllers, Services, Repositories, Middlewares e Utils
* **ORM:** Prisma ORM 6
* **Banco de desenvolvimento:** SQLite (`dev.db`)
* **Banco de produção:** PostgreSQL / SQLite
* **Autenticação:** JSON Web Tokens (JWT)
* **Hashing de senhas:** Bcrypt.js
* **Servidor Web / Proxy:** Caddy / Nginx / Next.js Rewrites

## Estrutura do Projeto

```text
farmacia-escola/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── ActivityLogController.ts
│   │   │   ├── AppointmentController.ts
│   │   │   ├── AuthController.ts
│   │   │   ├── BatchController.ts
│   │   │   ├── DisposalController.ts
│   │   │   ├── MedicineController.ts
│   │   │   ├── PatientController.ts
│   │   │   ├── ScheduleSlotController.ts
│   │   │   ├── UserController.ts
│   │   │   └── WithdrawalController.ts
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   └── roleMiddleware.ts
│   │   ├── repositories/
│   │   ├── routes/
│   │   │   ├── activityLogRoutes.ts
│   │   │   ├── appointmentRoutes.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── batchRoutes.ts
│   │   │   ├── disposalRoutes.ts
│   │   │   ├── medicineRoutes.ts
│   │   │   ├── patientRoutes.ts
│   │   │   ├── scheduleSlotRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   ├── withdrawalRoutes.ts
│   │   │   └── index.ts
│   │   ├── seed/
│   │   │   └── seed.ts
│   │   ├── services/
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   └── prisma.ts
│   │   └── index.ts
│   ├── Caddyfile
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── stock/
│   │   │   │       └── page.tsx
│   │   │   ├── administracao/
│   │   │   │   └── page.tsx
│   │   │   ├── agendamentos/
│   │   │   │   └── page.tsx
│   │   │   ├── appointments/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── calendario/
│   │   │   │   └── page.tsx
│   │   │   ├── configuracoes/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── estoque/
│   │   │   │   └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── medicines/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── pacientes/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── modules/
│   │   │   ├── pages/
│   │   │   ├── shared/
│   │   │   └── ui/
│   │   ├── config/
│   │   │   └── rbac.ts
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── providers/
│   │   ├── services/
│   │   ├── types/
│   │   └── proxy.ts
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── README.md
│
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## Pré-requisitos

* Node.js 18 ou superior
* npm 9 ou superior
* Git

## Instalação e Configuração

O projeto possui backend e frontend desacoplados com seus próprios gerenciadores de dependências (`package.json`).

### 1. Clone o repositório

```bash
git clone https://github.com/yuriigu/farmacia-escola.git
cd farmacia-escola
```

### 2. Configuração e Inicialização do Backend

Acesse o diretório do backend:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente criando o arquivo `.env` dentro de `backend/`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="farmacia-escola-secret-key-2024"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Sincronize o schema com o banco SQLite e gere o cliente Prisma:

```bash
npm run db:push
npm run db:generate
```

Popule o banco com a carga inicial de medicamentos, lotes, agendamentos e usuários de teste:

```bash
npm run db:seed
```

Inicie o servidor backend em modo de desenvolvimento:

```bash
npm run dev
```

A API estará em execução em `http://localhost:3001`.

### 3. Configuração e Inicialização do Frontend

Em outro terminal, acesse o diretório do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente criando o arquivo `.env` dentro de `frontend/`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
INTERNAL_API_URL="http://localhost:3001"
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse a aplicação no navegador em:

```text
http://localhost:3000
```

## Credenciais de Demonstração

O script de carga inicial (`npm run db:seed`) gera os seguintes usuários pré-configurados:

| Papel          | Nome                       | E-mail                                 | Senha         | Registro / Doc       | Permissões e Acesso                             |
| -------------- | -------------------------- | -------------------------------------- | ------------- | -------------------- | ----------------------------------------------- |
| `ADMIN`        | Admin Sistema              | `admin@farmaciaescola.edu.br`          | `admin123`    | CRF/SP 00001         | Configurações, usuários, auditoria e estoque    |
| `FARMACEUTICO` | Farm. Luciana Mendes       | `luciana@farmaciaescola.edu.br`        | `farm123`     | CRF/SP 12345         | Estoque, lotes, dispensações e agendamentos     |
| `FARMACEUTICO` | Farm. Pedro Almeida        | `pedro@farmaciaescola.edu.br`          | `farm123`     | CRF/SP 12346         | Preceptor farmacêutico e gestão de horários     |
| `MEDICO`       | Dr. Roberto Santos         | `roberto.medico@farmaciaescola.edu.br` | `medico123`   | CRM/SP 98765         | Consulta de estoque, agendamentos e pacientes   |
| `ALUNO`        | Ana Souza (Aluna)          | `ana.aluna@farmaciaescola.edu.br`      | `aluno123`    | RA 2024001           | Atendimento supervisionado e consulta de estoque|
| `PACIENTE`     | João Silva                 | `joao@email.com`                       | `paciente123` | CPF 123.456.789-00   | Catálogo e solicitação de agendamentos          |

> **Atenção:** as credenciais acima são destinadas exclusivamente ao ambiente de demonstração e desenvolvimento.

## Scripts Disponíveis

### Backend

| Script                | Descrição                                   |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Inicia o backend em modo de desenvolvimento |
| `npm run build`       | Compila o projeto e gera o Prisma Client    |
| `npm run start`       | Inicia o backend em produção                |
| `npm run db:push`     | Sincroniza o schema do Prisma com o banco   |
| `npm run db:migrate`  | Cria e executa migrações                    |
| `npm run db:generate` | Gera o Prisma Client                        |
| `npm run db:seed`     | Popula o banco com dados iniciais           |

### Frontend

| Script          | Descrição                                    |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Inicia o frontend em modo de desenvolvimento |
| `npm run build` | Gera o build de produção                     |
| `npm start`     | Inicia o Next.js em produção                 |
| `npm run lint`  | Executa a verificação de código              |

## Endpoints da API

A API Express disponibiliza os seguintes endpoints sob o prefixo `/api`:

### Autenticação & Perfil
* `POST   /api/auth/login` — Autenticação de usuário e emissão de token JWT
* `POST   /api/auth/register` — Cadastro de novo paciente/usuário
* `GET    /api/auth/me` — Dados do usuário logado (requer autenticação)
* `GET    /api/auth/profile` — Perfil do usuário autenticado
* `PUT    /api/auth/profile` — Atualização cadastral e alteração de senha

### Medicamentos
* `GET    /api/medicines` — Listagem de medicamentos
* `GET    /api/medicines/:id` — Detalhes do medicamento e seus lotes
* `POST   /api/medicines` — Cadastro de medicamento (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `PUT    /api/medicines/:id` — Atualização cadastral (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `DELETE /api/medicines/:id` — Remoção de medicamento (`ADMIN`, `FARMACEUTICO`)

### Lotes de Estoque
* `GET    /api/batches` — Listagem de lotes (filtro opcional por `medicineId`)
* `GET    /api/batches/:id` — Detalhes do lote
* `POST   /api/batches` — Entrada de novo lote (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `PUT    /api/batches/:id` — Atualização de saldo/validade (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `DELETE /api/batches/:id` — Exclusão de lote (`ADMIN`, `FARMACEUTICO`)

### Agendamentos de Retirada
* `GET    /api/appointments` — Listagem de agendamentos
* `GET    /api/appointments/:id` — Detalhes do agendamento e itens
* `POST   /api/appointments` — Criação de agendamento
* `PUT    /api/appointments/:id` — Atualização do agendamento (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `PUT    /api/appointments/:id/status` — Atualização de status (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
* `DELETE /api/appointments/:id` — Cancelamento do agendamento

### Grade de Horários
* `GET    /api/schedule-slots` — Horários de atendimento disponíveis
* `GET    /api/schedule-slots/:id` — Detalhes do horário
* `POST   /api/schedule-slots` — Criação de faixa de horário (`ADMIN`, `FARMACEUTICO`)
* `PUT    /api/schedule-slots/:id` — Atualização de capacidade/atendente (`ADMIN`, `FARMACEUTICO`)
* `DELETE /api/schedule-slots/:id` — Remoção de faixa de horário (`ADMIN`, `FARMACEUTICO`)

### Dispensações (Retiradas)
* `GET    /api/withdrawals` — Histórico de dispensações
* `GET    /api/withdrawals/:id` — Detalhes da dispensação
* `POST   /api/withdrawals` — Registro de dispensação com baixa de estoque (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `PUT    /api/withdrawals/:id` — Atualização da dispensação (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `DELETE /api/withdrawals/:id` — Cancelamento com estorno do saldo ao lote (`ADMIN`, `FARMACEUTICO`)

### Descartes
* `GET    /api/disposals` — Histórico de descartes motivados (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `GET    /api/disposals/:id` — Detalhes do descarte (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `POST   /api/disposals` — Registro de descarte com baixa no lote (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `PUT    /api/disposals/:id` — Edição de descarte (`ADMIN`, `FARMACEUTICO`)
* `DELETE /api/disposals/:id` — Exclusão de registro (`ADMIN`, `FARMACEUTICO`)
* `POST   /api/disposals/:id/revert` — Reversão de descarte com devolução ao lote (`ADMIN`, `FARMACEUTICO`)

### Pacientes
* `GET    /api/patients` — Listagem e busca de pacientes
* `GET    /api/patients/:id` — Detalhes cadastrais e histórico
* `POST   /api/patients` — Cadastro de paciente (`ADMIN`, `FARMACEUTICO`, `ALUNO`, `MEDICO`)
* `PUT    /api/patients/:id` — Atualização de paciente (`ADMIN`, `FARMACEUTICO`, `ALUNO`)
* `DELETE /api/patients/:id` — Remoção de paciente (`ADMIN`, `FARMACEUTICO`)

### Usuários & Administração
* `GET    /api/users` — Listagem de usuários cadastrados (`ADMIN`)
* `GET    /api/users/:id` — Detalhes de um usuário (`ADMIN`)
* `POST   /api/users` — Criação de usuário com perfil (`ADMIN`)
* `PUT    /api/users/:id` — Edição de dados do usuário (`ADMIN`)
* `DELETE /api/users/:id` — Exclusão de usuário (`ADMIN`)
* `PATCH  /api/users/:id/toggle-active` — Ativação/desativação de usuário (`ADMIN`)

### Auditoria & Sistema
* `GET    /api/activity-logs` — Trilha de auditoria paginada (`ADMIN`)
* `GET    /api/activity-logs/:id` — Detalhes do evento de auditoria (`ADMIN`)
* `GET    /health` — Status de integridade e uptime da API

## Arquitetura

O projeto utiliza uma arquitetura full-stack dividida em dois módulos principais:

### Backend

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
Database
```

Essa estrutura permite separar:

* Comunicação HTTP
* Regras de negócio
* Persistência de dados
* Validações
* Autenticação e autorização

### Frontend

```text
Pages / App Router
        ↓
Components
        ↓
Hooks / Services
        ↓
React Query / Zustand
        ↓
API
```

O frontend utiliza o Next.js App Router para organização das páginas e TanStack React Query para comunicação e cache dos dados, enquanto o Zustand é utilizado para gerenciamento do estado global.

## Segurança e Auditoria

O sistema implementa mecanismos de segurança e governança para controlar o acesso às funcionalidades.

### Autenticação

* Autenticação baseada em JWT
* Proteção de endpoints
* Hashing de senhas com Bcrypt.js
* Controle de sessão

### Autorização

O acesso às funcionalidades é controlado de acordo com o papel do usuário utilizando RBAC.

### Auditoria

As operações relevantes do sistema podem ser registradas na trilha de auditoria, incluindo:

* Login
* Cadastro
* Alterações
* Exclusões
* Dispensações
* Descartes
* Operações administrativas

## Documentação Específica

Para obter informações técnicas mais detalhadas sobre cada parte do sistema, consulte:

* **Backend:** [`backend/README.md`](backend/README.md)

  * Endpoints da API
  * Modelo de dados
  * Prisma Schema
  * Autenticação
  * Regras de estoque
  * Scripts do backend

* **Frontend:** [`frontend/README.md`](frontend/README.md)

  * Estrutura de páginas
  * Componentes
  * Gerenciamento de estado
  * React Query
  * RBAC
  * Temas e interface

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua funcionalidade:

```bash
git checkout -b feature/nova-funcionalidade
```

3. Faça as alterações necessárias
4. Execute os testes e verificações
5. Realize o commit seguindo o padrão Conventional Commits:

```text
feat: adiciona nova funcionalidade
fix: corrige problema no agendamento
docs: atualiza documentação
refactor: reorganiza serviço de estoque
```

6. Envie a branch:

```bash
git push origin feature/nova-funcionalidade
```

7. Abra um Pull Request

### Diretrizes

* Mantenha o código organizado e documentado
* Siga os padrões existentes no projeto
* Escreva testes para novas funcionalidades quando aplicável
* Atualize a documentação quando necessário
* Utilize mensagens de commit padronizadas

## Suporte

Para reportar bugs, sugerir melhorias ou solicitar novas funcionalidades, utilize o sistema de Issues do GitHub.

## Autor

**Yuri Simplicio**

* GitHub: [@yuriigu](https://github.com/yuriigu)
* E-mail: `yurigustavo415@gmail.com`

## Agradecimentos

* Docentes, preceptores e alunos do curso de Farmácia do Centro Universitário Integrado.
* Equipe de Tecnologia e Desenvolvimento do Grupo Integrado.

## Licença

Este projeto é distribuído sob os termos da licença **MIT**.

Consulte o arquivo `LICENSE` para obter mais informações.