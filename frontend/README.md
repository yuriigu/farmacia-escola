# Farmácia Escola - Frontend Web

Aplicação web moderna, intuitiva e acessível desenvolvida com **Next.js 16 (App Router)**, **React 19**, **TypeScript** e **Tailwind CSS v4** para atender às operações da Farmácia Escola Universitária.

---

## 🎯 Sobre o Frontend

O frontend proporciona uma experiência adaptada para cada tipo de usuário que interage com o serviço de saúde da universidade:

- 👤 **Portal do Paciente**:
  - Consulta interativa ao catálogo de medicamentos com filtros por categoria e disponibilidade em tempo real.
  - Explicação acessível para leigos sobre como utilizar cada medicamento e cuidados essenciais.
  - Solicitação de agendamento prévio de horários para retirada presencial na farmácia.
  - Acompanhamento do status dos seus agendamentos e histórico de retiradas anteriores.

- 🩺 **Módulo do Farmacêutico e Alunos**:
  - Painel de controle (Dashboard) com métricas de estoque crítico, medicamentos próximos ao vencimento e fluxo do dia.
  - Gestão de estoque com visualização em abas: catálogo de medicamentos, lotes físicos, dispensações efetuadas e descartes.
  - Registro de retiradas e baixa imediata no lote com orientações farmacêuticas.
  - Gestão da grade de horários e confirmação de agendamentos.

- ⚙️ **Módulo de Administração**:
  - Cadastro e controle de operadores (alunos, farmacêuticos, médicos e administradores).
  - Consulta completa à trilha de auditoria e logs de atividades do sistema.

---

## 🚀 Tecnologias e Bibliotecas

### Core
- **Framework**: [Next.js 16](https://nextjs.org/) utilizando a arquitetura moderna do **App Router** (`src/app/`).
- **Biblioteca de UI**: [React 19](https://react.dev/) com componentes funcionais e hooks.
- **Tipagem**: [TypeScript 5](https://www.typescriptlang.org/) com tipagem estrita para modelos e respostas de API.

### Estado e Comunicação Assíncrona
- **Gerenciamento de Cache do Servidor**: [TanStack React Query v5](https://tanstack.com/query) para cache de dados, mutações otimistas e revalidação em segundo plano.
- **Gerenciamento de Estado Global**: [Zustand v5](https://zustand-demo.pmnd.rs/) com o store `useAuthStore` integrado a cookies (`js-cookie`) e `localStorage`.
- **Cliente HTTP**: [Axios](https://axios-http.com/) com interceptors para inclusão automática do cabeçalho `Authorization: Bearer <token>`.

### Design e Interface de Usuário
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) com `@tailwindcss/postcss`.
- **Componentes Base (Design System)**: [Radix UI](https://www.radix-ui.com/) e [Shadcn UI](https://ui.shadcn.com/) (Dialogs, Dropdowns, Tabs, Selects, Tooltips, Accordions).
- **Formulários & Schemas**: [React Hook Form](https://react-hook-form.com/) integrado com [Zod](https://zod.dev/) para validação em tempo real.
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Notificações**: [Sonner](https://sonner.emilkowal.ski/)
- **Gráficos & Visualização**: [Recharts](https://recharts.org/)
- **Gerenciamento de Tema**: [next-themes](https://github.com/pacocoursey/next-themes) (suporte nativo a Light/Dark mode).

---

## 📋 Pré-requisitos

- **Node.js**: `v18.0.0` ou superior
- **npm**: `v9.0.0` ou superior (ou gerenciador compatível)

---

## 🔧 Instalação e Execução

### 1. Acessar a pasta do frontend
```bash
cd frontend
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` no diretório `frontend/` com a URL base da API:
```env
NEXT_PUBLIC_API_URL="/backend"
```

### 4. Executar em desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em: `http://localhost:3000`

### 5. Compilação para Produção
```bash
npm run build
npm start
```

Para verificar conformidade com o linter:
```bash
npm run lint
```

---

## 📁 Estrutura de Diretórios

```
frontend/src/
├── app/                          # Rotas e páginas (Next.js App Router)
│   ├── (auth)/
│   │   ├── login/                # Página de login com seleção rápida de perfis demo
│   │   └── register/             # Cadastro público para pacientes
│   ├── administracao/            # Gestão de usuários e logs de auditoria
│   ├── agendamentos/             # Visualização e gestão da agenda de atendimentos
│   ├── appointments/             # Fluxo de solicitação de agendamento por pacientes
│   │   └── new/                  # Formulário guiado de novo agendamento
│   ├── calendario/               # Visão de calendário dos slots de horário
│   ├── dashboard/                # Painel principal com KPIs, gráficos e alertas
│   ├── estoque/                  # Módulo de estoque (Medicamentos, Lotes, Retiradas, Descartes)
│   ├── medicines/                # Catálogo público de medicamentos para busca e consulta
│   │   └── [id]/                 # Detalhes e disponibilidade do medicamento selecionado
│   ├── profile/                  # Perfil do usuário logado e troca de senha
│   ├── backend/                  # Route handler de mock/API interna para execução integrada
│   ├── globals.css               # Estilos globais e diretivas do Tailwind CSS v4
│   └── layout.tsx                # Root layout com QueryProvider e ThemeProvider
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Container principal com Sidebar retrátil e Header
│   │   └── TabBar.tsx            # Barra de navegação por abas contextuais
│   ├── modules/                  # Módulos encapsulados (Inventory, Calendar, Admin)
│   ├── pages/                    # Views das páginas (DashboardPage, InventoryPage, etc.)
│   ├── shared/                   # Componentes compartilhados (StockBadge, StatusBadge, etc.)
│   └── ui/                       # Primitivos Shadcn UI (button, dialog, input, card, tabs)
├── config/
│   └── rbac.ts                   # Mapeamento de permissões e controle de acesso por papel
├── hooks/                        # Custom Hooks (useAgendamento, useEstoque, use-mobile)
├── lib/
│   ├── auth-store.ts             # Store Zustand de autenticação (token e perfil)
│   ├── types.ts                  # Interfaces TypeScript dos modelos de dados
│   └── utils.ts                  # Utilitários de classes CSS (`cn`) e formatações
├── providers/                    # Providers React (QueryClientProvider, ThemeProvider)
└── services/
    ├── api.ts                    # Instância Axios e endpoints da API
    └── queries.ts                # Hooks do React Query para consumo e cache de dados
```

---

## 🎨 Principais Páginas e Telas

| Rota | Descrição | Perfis Permitidos |
|:---|:---|:---|
| `/dashboard` | Resumo de métricas operacionais, avisos de validade e atalhos de ação rápida | Todos os perfis autenticados |
| `/medicines` | Catálogo de busca de medicamentos com instruções posológicas acessíveis | Todos os perfis |
| `/estoque` | Gestão completa de medicamentos, lotes, dispensações e descartes com filtros avançados | `ADMIN`, `FARMACEUTICO`, `ALUNO` |
| `/agendamentos` | Lista detalhada e acompanhamento de agendamentos de retiradas | `ADMIN`, `FARMACEUTICO`, `MEDICO` |
| `/appointments/new` | Formulário para agendar data, horário e anexar medicamentos desejados | `PACIENTE`, `ADMIN`, `FARMACEUTICO` |
| `/pacientes` | Lista de pacientes cadastrados com histórico individual de dispensações | `ADMIN`, `FARMACEUTICO` |
| `/administracao` | Gerenciamento de credenciais de usuários e consulta a logs de auditoria | `ADMIN` |
| `/profile` | Visualização de dados pessoais e alteração de senha de acesso | Todos os perfis |

---

## 🔒 Controle de Acesso e Segurança no Cliente (RBAC)

O arquivo `src/config/rbac.ts` define a matriz de permissões do sistema. As rotas protegidas utilizam o componente `ProtectedRoute`:

```typescript
// Exemplo de verificação de permissão
const hasAccess = hasRouteAccess(user?.role, pathname);
```

- **Sessão Persistente**: O token JWT e as informações do usuário são persistidos via `js-cookie` e `localStorage`, sincronizando o estado da sessão entre abas.
- **Tratamento de Sessão Expirada**: Interceptores HTTP detectam retornos `401 Unauthorized` e executam logout automático com redirecionamento para `/login`.

---

## 🎨 Design System e Temas

- **Paleta de Cores**: Paleta profissional médica/farmacêutica baseada em tons de verde esmeralda (`#059669`), teal e neutros de alto contraste.
- **Light & Dark Mode**: Alternância de tema com zero flash visual (`suppressHydrationWarning`), respeitando as preferências do sistema operacional do usuário.
- **Responsividade Total**: Layout fluido otimizado para dispositivos móveis (`sm`), tablets (`md`) e desktops de alta resolução (`lg`/`xl`).
