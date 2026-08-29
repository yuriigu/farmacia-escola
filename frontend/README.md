# Farmácia Escola — Frontend

Aplicação web moderna, intuitiva e acessível desenvolvida com Next.js, React, TypeScript e Tailwind CSS para atender às operações da Farmácia Escola Universitária.

## Sobre o Projeto

O frontend fornece uma interface unificada para os diferentes perfis de usuários da plataforma, permitindo acesso ao catálogo de medicamentos, agendamentos, estoque, dispensações, dashboards e funcionalidades administrativas.

### Principais Características

* Interface responsiva e acessível
* Portal dedicado aos pacientes
* Catálogo de medicamentos
* Consulta de disponibilidade em estoque
* Agendamento de retiradas
* Acompanhamento de agendamentos
* Dashboard operacional
* Gestão de estoque
* Controle de dispensações e descartes
* Gestão administrativa
* Controle de acesso baseado em papéis (RBAC)
* Suporte a temas claro e escuro
* Formulários com validação
* Visualização de métricas e indicadores

## Stack Tecnológica

### Core

* Next.js 16 — App Router
* React 19
* TypeScript 5

### Estado e Comunicação

* TanStack React Query 5
* Zustand 5
* Axios
* js-cookie
* localStorage

### Interface e Design

* Tailwind CSS 4
* Radix UI
* Shadcn UI
* React Hook Form
* Zod
* Lucide React
* Sonner
* Recharts
* next-themes

## Pré-requisitos

* Node.js 18 ou superior
* npm 9 ou superior
* Backend da Farmácia Escola em execução

## Instalação

### Clone o repositório

```bash
git clone https://github.com/seu-usuario/farmacia-escola.git
cd farmacia-escola
```

### Acesse a pasta do frontend

```bash
cd frontend
```

### Instale as dependências

```bash
npm install
```

### Configure as variáveis de ambiente

Crie um arquivo `.env` no diretório `frontend/`:

```env
NEXT_PUBLIC_API_URL="/backend"
```

## Executando o Projeto

### Desenvolvimento

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:3000
```

### Produção

Gere o build:

```bash
npm run build
```

Inicie a aplicação:

```bash
npm start
```

### Verificação de código

Para executar o linter:

```bash
npm run lint
```

## Scripts Disponíveis

| Script          | Descrição                                  |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento       |
| `npm run build` | Cria o build de produção                   |
| `npm start`     | Inicia o servidor Next.js em produção      |
| `npm run lint`  | Executa a verificação de código com ESLint |

## Funcionalidades

### Portal do Paciente

* Consulta ao catálogo de medicamentos
* Filtros por categoria e disponibilidade
* Informações acessíveis sobre medicamentos
* Solicitação de agendamentos
* Seleção de medicamentos para retirada
* Acompanhamento do status dos agendamentos
* Consulta do histórico de retiradas

### Módulo do Farmacêutico e Alunos

* Dashboard com indicadores operacionais
* Visualização de estoque crítico
* Alertas de medicamentos próximos ao vencimento
* Consulta de lotes
* Registro de dispensações
* Registro de descartes
* Gestão da grade de horários
* Confirmação de agendamentos

### Módulo Administrativo

* Gerenciamento de usuários
* Cadastro de operadores
* Controle de perfis
* Consulta de logs de auditoria
* Gerenciamento das permissões de acesso

## Principais Páginas

| Rota                | Descrição                                            | Perfis Permitidos                   |
| ------------------- | ---------------------------------------------------- | ----------------------------------- |
| `/dashboard`        | Dashboard com métricas, alertas e atalhos            | Usuários autenticados               |
| `/medicines`        | Catálogo e consulta de medicamentos                  | Todos os perfis                     |
| `/estoque`          | Gestão de medicamentos, lotes, retiradas e descartes | `ADMIN`, `FARMACEUTICO`, `ALUNO`    |
| `/agendamentos`     | Gestão e acompanhamento de agendamentos              | `ADMIN`, `FARMACEUTICO`, `MEDICO`   |
| `/appointments/new` | Criação de novos agendamentos                        | `PACIENTE`, `ADMIN`, `FARMACEUTICO` |
| `/pacientes`        | Consulta de pacientes e histórico                    | `ADMIN`, `FARMACEUTICO`             |
| `/administracao`    | Usuários e auditoria                                 | `ADMIN`                             |
| `/profile`          | Dados pessoais e alteração de senha                  | Todos os perfis                     |

## Controle de Acesso

O controle de acesso é centralizado no arquivo:

```text
src/config/rbac.ts
```

A aplicação utiliza uma matriz de permissões para determinar quais funcionalidades cada perfil pode acessar.

### Exemplo

```typescript
const hasAccess = hasRouteAccess(user?.role, pathname);
```

Os principais perfis utilizados pelo sistema são:

* `ADMIN`
* `FARMACEUTICO`
* `MEDICO`
* `ALUNO`
* `PACIENTE`

## Segurança da Sessão

* Autenticação baseada em JWT
* Persistência da sessão utilizando cookies e localStorage
* Interceptação automática de requisições HTTP
* Inclusão automática do token Bearer
* Detecção de respostas `401 Unauthorized`
* Logout automático quando a sessão expira
* Redirecionamento para a tela de login

## Design System

A interface utiliza um conjunto de componentes reutilizáveis baseado em Radix UI e Shadcn UI.

### Componentes

* Dialogs
* Dropdowns
* Tabs
* Selects
* Tooltips
* Accordions
* Buttons
* Inputs
* Cards
* Badges

### Temas

A aplicação oferece suporte a:

* Light Mode
* Dark Mode
* Preferência automática baseada no sistema operacional

### Responsividade

O layout foi desenvolvido para funcionar em:

* Smartphones
* Tablets
* Notebooks
* Desktops
* Monitores de alta resolução

## Estrutura do Projeto

```text
frontend/
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/
    │   │   └── register/
    │   ├── administracao/
    │   ├── agendamentos/
    │   ├── appointments/
    │   │   └── new/
    │   ├── calendario/
    │   ├── dashboard/
    │   ├── estoque/
    │   ├── medicines/
    │   │   └── [id]/
    │   ├── profile/
    │   ├── backend/
    │   ├── globals.css
    │   └── layout.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   └── TabBar.tsx
    │   ├── modules/
    │   ├── pages/
    │   ├── shared/
    │   └── ui/
    ├── config/
    │   └── rbac.ts
    ├── hooks/
    ├── lib/
    │   ├── auth-store.ts
    │   ├── types.ts
    │   └── utils.ts
    ├── providers/
    └── services/
        ├── api.ts
        └── queries.ts
```

## Arquitetura do Frontend

A aplicação utiliza o App Router do Next.js para organização das rotas e componentes.

### Server Components

Utilizados para conteúdos que não necessitam de interatividade no cliente.

### Client Components

Utilizados para funcionalidades interativas, formulários, estados locais e componentes que dependem de APIs do navegador.

### Gerenciamento de Estado

O estado global de autenticação é gerenciado pelo Zustand, enquanto o TanStack React Query é utilizado para:

* Cache de dados
* Requisições assíncronas
* Sincronização com a API
* Revalidação em segundo plano
* Gerenciamento de mutações

## Padrões de Desenvolvimento

* Componentes funcionais com React Hooks
* Separação entre componentes de interface e lógica de negócio
* Uso de TypeScript com tipagem estrita
* Componentização reutilizável
* Gerenciamento centralizado de autenticação
* Validação de formulários com Zod
* React Query para comunicação e cache de dados
* Controle de acesso baseado em RBAC
* Design responsivo e acessível

## Suporte

Para reportar problemas ou solicitar melhorias, utilize o sistema de Issues do GitHub.