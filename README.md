# Farmácia Escola

Sistema de gestão para farmácias universitárias: controle de estoque, retiradas por pacientes, descartes de medicamentos e agendamentos farmacêuticos.

## Stack

- React 18
- Tailwind CSS v4
- TypeScript 5.6
- Vite 5
- Lucide React (ícones)
- Radix UI (componentes acessíveis)

## Funcionalidades

- Catálogo de medicamentos com busca e filtro por categoria
- Gestão de lotes com controle de validade e quantidade
- Registro de retiradas por paciente com baixa automática no estoque
- Registro de descartes com motivo e rastreabilidade por lote
- Alertas de estoque baixo e lotes próximos ao vencimento
- Agenda de atendimentos farmacêuticos (quadro por status)
- Calendário de atendimentos com visão semanal
- Dashboard com indicadores de estoque e atividade recente
- Layout responsivo com sidebar fixa

## Como executar

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

### Backend

```bash
cd backend
npm install
npm run dev
```

A API estará disponível em `http://localhost:3001`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Iniciar servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run seed` | Popular banco com usuário admin padrão |

## Estrutura do projeto

```
src/
  components/         Componentes reutilizáveis
    Header/
    Sidebar/
    Modal/
    StatusBadge/

  pages/              Componentes de cada rota
    Home/             Dashboard com indicadores
    Inventory/        Catálogo e busca de medicamentos
    StockManagement/  Entrada e gestão de lotes
    Withdrawals/      Retiradas de medicamentos por paciente
    Disposals/        Registro de descartes
    Appointments/     Quadro de atendimentos farmacêuticos
    AppointmentsOverview/ Calendário semanal de atendimentos

  lib/                Dados e utilitários
    api.ts            Cliente HTTP (axios)
    types.ts          Interfaces e tipos globais
    utils.ts          Funções utilitárias
    PharmacyContext.tsx Estado global da aplicação
```

## Rotas

| Caminho (tab) | Página |
|---------------|--------|
| `dashboard` | Visão geral / Dashboard |
| `inventory` | Estoque e catálogo de medicamentos |
| `stock-management` | Entrada de lotes |
| `withdrawals` | Retiradas de medicamentos |
| `appointments-overview` | Calendário de atendimentos |
| `appointments` | Quadro de consultas |
| `disposals` | Registro de descartes |

## Endpoints da API

### Autenticação — `/auth`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/login` | Login e geração de token JWT |
| `GET` | `/auth/me` | Dados do usuário autenticado |

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
| `GET` | `/batches/alerts` | Lotes com baixo estoque ou próximos ao vencimento |

### Retiradas — `/withdrawals`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/withdrawals` | Registrar retirada com baixa no estoque *(protegido)* |
| `GET` | `/withdrawals` | Histórico de retiradas |

### Descartes — `/disposals`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/disposals` | Registrar descarte com baixa no estoque *(protegido)* |
| `GET` | `/disposals` | Histórico de descartes |

## Banco de dados

MySQL 8 gerenciado via Prisma ORM.

| Entidade | Descrição |
|----------|-----------|
| `User` | Usuários do sistema (ADMIN / FARMACEUTICO / ALUNO) |
| `Patient` | Pacientes atendidos |
| `Medicine` | Catálogo de medicamentos |
| `StockBatch` | Lotes em estoque |
| `Withdrawal` | Retiradas por paciente |
| `WithdrawalItem` | Itens de cada retirada (M:N entre Withdrawal e StockBatch) |
| `Disposal` | Descartes de lotes com motivo |

## Variáveis de ambiente

### Backend (`.env`)

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `DATABASE_URL` | `mysql://farmaceutico:farmapassword@localhost:3306/farmacia_escola` | Conexão MySQL |
| `JWT_SECRET` | `farmacia_escola_secret_key` | Chave de assinatura JWT |
| `PORT` | `3001` | Porta do servidor HTTP |

### Frontend (`.env`)

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

## Infraestrutura

```bash
docker compose up -d
```

Sobe MySQL 8 na porta `3306` e Adminer (interface web do banco) na porta `8080`.

## Seed

Cria o usuário administrador padrão:

```bash
cd backend
npm run seed
```

| Campo | Valor |
|-------|-------|
| E-mail | `admin@farmaciaescola.edu.br` |
| Senha | `admin123` |
| Perfil | `ADMIN` |

## Middleware

Rotas marcadas como *protegido* exigem token JWT no header `Authorization: Bearer <token>`.

## Licença

MIT
