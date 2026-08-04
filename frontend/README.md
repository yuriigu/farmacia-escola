# Farmácia Escola — Frontend

Interface de gestão farmacêutica: estoque, retiradas, descartes e agendamentos em painel único com fallback offline.

## Stack

- React 18
- TypeScript 5.6
- Vite 5
- Tailwind CSS v4
- Radix UI (Dialog, Select, Tabs, Popover…)
- React Hook Form + Zod
- TanStack Query 5
- Axios
- date-fns
- Lucide React (ícones)

## Funcionalidades

- Catálogo de medicamentos com busca por nome e filtro por categoria
- Gestão de lotes com controle de quantidade e validade
- Alertas visuais de estoque baixo, crítico e lotes vencidos
- Registro de retiradas por paciente vinculado ao lote
- Registro de descartes com motivo e responsável
- Quadro de atendimentos farmacêuticos com filtro por status
- Calendário semanal de agendamentos
- Dashboard com indicadores e atividade recente
- Fallback com dados locais quando a API estiver indisponível

## Como Executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |

## Variáveis de Ambiente

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `VITE_API_URL` | `http://localhost:3001` | URL base da API |

## Estrutura do Projeto

```
src/
  components/              Componentes reutilizáveis
    Header.tsx             Cabeçalho com título da tela ativa
    Sidebar.tsx            Navegação lateral com menu de seções
    Modal.tsx              Modal genérico para formulários
    StatusBadge.tsx        Badge de status de estoque (ok/low/critical/expired)

  pages/                   Componentes de cada tela
    Home.tsx               Dashboard com indicadores e atividade recente
    Inventory.tsx          Catálogo de medicamentos com busca e filtro
    StockManagement.tsx    Entrada e gestão de lotes
    Withdrawals.tsx        Retiradas de medicamentos por paciente
    Disposals.tsx          Registro e histórico de descartes
    Appointments.tsx       Quadro de consultas farmacêuticas por status
    AppointmentsOverview.tsx  Calendário semanal de atendimentos

  lib/                     Utilitários e estado global
    api.ts                 Cliente HTTP (axios) com baseURL configurável
    types.ts               Interfaces e tipos globais (Medicine, Patient, Batch…)
    utils.ts               Funções utilitárias (cn, formatação)
    PharmacyContext.tsx    Estado global via Context API + fallback offline
```

## Telas

| Tab | Página |
|-----|--------|
| `dashboard` | Visão geral com indicadores de estoque e atividade recente |
| `inventory` | Catálogo de medicamentos com busca e filtro por categoria |
| `stock-management` | Entrada de novos lotes |
| `withdrawals` | Registro e histórico de retiradas por paciente |
| `appointments-overview` | Calendário semanal de atendimentos |
| `appointments` | Quadro de consultas farmacêuticas por status |
| `disposals` | Registro e histórico de descartes |

## Estado Global

O `PharmacyContext` centraliza os dados da aplicação. Ao inicializar, tenta carregar os dados da API em paralelo (`/inventory`, `/withdrawals`, `/disposals`, `/appointments`). Em caso de falha na conexão, sinaliza o estado `offline` e mantém os dados de fallback locais para que a interface continue funcional.

## Design

- Paleta verde-esmeralda (`emerald-600`) como cor primária
- Sidebar escura (`slate-900`) com contraste em branco
- Cards com bordas sutis (`slate-200`) e fundo branco
- Status de estoque com cores semânticas: verde (ok), âmbar (low), vermelho (critical/expired)

## Licença

MIT
