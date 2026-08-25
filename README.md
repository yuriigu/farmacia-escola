# Farmácia Escola - Sistema de Gestão Farmacêutica Universitária

Sistema web full-stack desenvolvido para gerenciamento integrado de farmácia escola universitária, contemplando o controle de estoque e rastreabilidade de lotes, agendamento prévio de retiradas por pacientes, dispensação supervisionada de medicamentos, descarte motivado e trilha de auditoria para conformidade regulatória.

---

## 📚 Sobre o Projeto

O **Farmácia Escola** foi concebido para transformar a operação diária de farmácias universitárias e comunitárias integradas ao ensino superior em saúde. A plataforma atua como ponte digital entre estudantes de graduação em Farmácia, farmacêuticos preceptores, médicos e os pacientes da comunidade externa atendida pelo serviço.

### 🎯 Objetivo

- **Para a Gestão e Farmacêuticos**: Assegurar controle rigoroso de entradas, saídas, prazos de validade e saldos de medicamentos, prevenindo perdas e garantindo conformidade sanitária.
- **Para os Estudantes (Alunos)**: Oferecer um ambiente de aprendizado supervisionado, simulando a rotina profissional de dispensação, orientação farmacoterapêutica e conferência de prescrições.
- **Para os Pacientes**: Proporcionar autonomia e comodidade através da consulta de disponibilidade de itens em catálogo público com linguagem acessível e agendamento de horários para retirada presencial sem filas.

### 💡 Problemas Resolvidos

- ⏱️ **Redução de Filas e Aglomerações**: Distribuição do fluxo de atendimento através de agendamentos com controle de capacidade máxima por faixa horária.
- 📦 **Prevenção de Perdas por Vencimento**: Rastreabilidade individual por lotes de fabricação com alertas visuais preventivos (medicamentos com menos de 30 dias de validade).
- 📖 **Comunicação Clara em Saúde**: Descrições acessíveis dos medicamentos voltadas a leigos, explicando modo de uso, finalidade terapêutica e cuidados essenciais.
- 🔍 **Rastreabilidade e Governança (RBAC)**: Registro detalhado de logs de atividades para cada ação de login, dispensação, descarte ou alteração cadastral, atrelando a responsabilidade técnica ao profissional executor.

---

## 🚀 Funcionalidades Principais

### 💊 Gestão de Estoque e Lotes
- Cadastro detalhado de medicamentos com nome comercial, princípio ativo, dosagem, categoria e orientações acessíveis.
- Controle de múltiplos lotes (`StockBatch`) por medicamento, armazenando código do lote, quantidade em estoque, data de recebimento e data de expiração.
- Identificação automática de lotes válidos, em alerta de vencimento próximo ou vencidos.
- Registro de descartes motivados (quebra de frasco, desvio de temperatura, prazo expirado) com funcionalidade de reversão justificada.

### 📅 Grade de Horários e Agendamentos
- Criação e manutenção de slots de atendimento (`ScheduleSlot`) por data, horário, capacidade máxima e farmacêutico responsável.
- Agendamento de atendimentos (`Appointment`) com vínculo de pacientes e múltiplos medicamentos requisitados (`AppointmentItem`).
- Controle de ciclo de vida do agendamento com estados: `PENDING` (Pendente), `CONFIRMED` (Confirmado), `COMPLETED` (Concluído) e `CANCELLED` (Cancelado).

### 👥 Dispensação e Gestão de Pacientes
- Cadastro completo de pacientes com CPF, data de nascimento, telefone e endereço.
- Módulo de dispensação direta (`Withdrawals`), realizando a baixa automática da quantidade retirada no lote correspondente.
- Histórico completo de retiradas e consultas por paciente.

### 🛡️ Controle de Acesso Baseado em Papéis (RBAC)
O sistema implementa regras estritas de autorização granular para 5 papéis:
- **ADMIN**: Gestão total da aplicação, usuários, configurações globais e auditoria.
- **FARMACEUTICO**: Responsabilidade técnica, gestão de estoque, validação de receitas, liberação de dispensações e agendamentos.
- **MEDICO**: Consulta de disponibilidade de fármacos e encaminhamentos clínicos.
- **ALUNO**: Atendimento supervisionado, consulta ao estoque e registro assistido de dispensações.
- **PACIENTE**: Acesso ao catálogo de medicamentos, histórico próprio e solicitação de agendamento de retirada.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework Web**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Componentes UI**: [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Gerenciamento de Estado do Servidor**: [TanStack React Query v5](https://tanstack.com/query)
- **Gerenciamento de Estado Global**: [Zustand v5](https://zustand-demo.pmnd.rs/)
- **Validação de Formulários**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Ícones e Feedback**: [Lucide React](https://lucide.dev/) & [Sonner Toasts](https://sonner.emilkowal.ski/)
- **Gráficos e Métricas**: [Recharts](https://recharts.org/)

### Backend
- **Ambiente de Execução**: [Node.js](https://nodejs.org/) (v18+)
- **Framework HTTP**: [Express.js](https://expressjs.com/) com arquitetura modular (Controllers, Services, Repositories, Middlewares)
- **ORM & Banco de Dados**: [Prisma ORM](https://www.prisma.io/) com suporte a [SQLite](https://www.sqlite.org/) e [PostgreSQL](https://www.postgresql.org/)
- **Autenticação & Segurança**: [JSON Web Tokens (JWT)](https://jwt.io/) e [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
- **Servidor Web / Proxy**: [Caddy](https://caddyserver.com/)

---

## 📁 Estrutura do Monorepo

```
farmacia-escola/
├── backend/                      # API RESTful em Express + Prisma
│   ├── prisma/                   # Schema do banco de dados e migrações
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/          # Controladores HTTP (Auth, Medicines, Batches, etc.)
│   │   ├── middlewares/          # Middlewares de JWT, RBAC e validação
│   │   ├── repositories/         # Camada de persistência via Prisma Client
│   │   ├── routes/               # Definição e roteamento de endpoints
│   │   ├── services/             # Regras de negócio e validações de estoque
│   │   ├── seed/                 # Script de população inicial do banco de dados
│   │   └── index.ts              # Ponto de entrada do servidor Express
│   ├── package.json              # Dependências e scripts do backend
│   └── README.md                 # Documentação detalhada do Backend
├── frontend/                     # Interface Web em Next.js 16
│   ├── src/
│   │   ├── app/                  # Rotas e páginas do Next.js App Router
│   │   │   ├── (auth)/login/     # Tela de autenticação com atalhos de perfil
│   │   │   ├── (auth)/register/  # Cadastro simplificado de pacientes
│   │   │   ├── administracao/    # Painel administrativo (Usuários, Auditoria)
│   │   │   ├── agendamentos/     # Gestão da agenda de atendimentos
│   │   │   ├── appointments/     # Solicitação de agendamento por pacientes
│   │   │   ├── calendario/       # Visão de calendário e horários
│   │   │   ├── dashboard/        # Painel central com métricas e KPIs
│   │   │   ├── estoque/          # Estoque, lotes, dispensações e descartes
│   │   │   ├── medicines/        # Catálogo público de medicamentos
│   │   │   ├── profile/          # Perfil do usuário logado
│   │   │   ├── backend/          # Handlers de API integrados para modo standalone
│   │   │   └── globals.css       # Estilos globais Tailwind CSS v4
│   │   ├── components/           # Componentes reutilizáveis (Layout, UI, Módulos)
│   │   ├── config/               # Definições de permissão RBAC
│   │   ├── hooks/                # Hooks customizados React
│   │   ├── lib/                  # Stores Zustand, clientes HTTP e tipagens
│   │   └── services/             # Camada de serviços e queries React Query
│   ├── package.json              # Dependências e scripts do frontend
│   └── README.md                 # Documentação detalhada do Frontend
├── .env.example                  # Modelo de variáveis de ambiente
├── metadata.json                 # Metadados de implantação da aplicação
├── package.json                  # Configuração de workspaces npm na raiz
└── README.md                     # Este arquivo de documentação geral
```

---

## 📥 Instalação e Execução

### 1. Clonar o Repositório
```bash
git clone https://github.com/yuriigu/farmacia-escola.git
cd farmacia-escola
```

### 2. Instalar as Dependências
O projeto utiliza **npm workspaces**. Instale todas as dependências de uma única vez a partir da raiz:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o modelo de variáveis de ambiente na raiz:
```bash
cp .env.example .env
```

Conteúdo padrão do `.env`:
```env
JWT_SECRET="farmacia-escola-secret-key-2024"
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_API_URL="/backend"
```

### 4. Executar em Modo de Desenvolvimento
Inicie a aplicação unificada na porta padrão (3000):
```bash
npm run dev
```

Acesse no seu navegador: `http://localhost:3000`

### 5. Compilação para Produção
```bash
npm run build
npm start
```

---

## 🔑 Credenciais de Demonstração

Para facilitar a exploração dos diferentes fluxos e níveis de acesso (RBAC), o sistema já vem pré-configurado com os seguintes usuários de teste:

| Papel | E-mail de Acesso | Senha | Descrição de Uso |
|:---|:---|:---|:---|
| **ADMIN** | `admin@farmaciaescola.edu.br` | `admin123` | Acesso irrestrito a configurações, usuários e logs de auditoria |
| **FARMACEUTICO** | `luciana@farmaciaescola.edu.br` | `farm123` | Gestão de estoque, lotes, dispensação e validação técnica |
| **FARMACEUTICO** | `pedro@farmaciaescola.edu.br` | `farm123` | Farmacêutico preceptor com escala de horários atribuída |
| **ALUNO** | `ana.aluna@farmaciaescola.edu.br` | `aluno123` | Registro assistido de dispensações e consulta de estoque |
| **PACIENTE** | `joao@email.com` | `paciente123` | Acesso ao catálogo e solicitação de agendamento de retirada |

---

## 📚 Documentações Específicas

Para aprofundar nos detalhes técnicos de cada módulo, consulte as documentações dedicadas:

- 🔗 [Documentação Técnica do Backend](backend/README.md) – Endpoints, Prisma Schema, autenticação JWT, regras de estoque e migrações.
- 🔗 [Documentação Técnica do Frontend](frontend/README.md) – Estrutura de rotas, componentes Shadcn, queries React Query, gerenciamento de estado e temas.

---

## 👨‍💻 Autor

- **Yuri Simplicio** - [GitHub @yuriigu](https://github.com/yuriigu) - `yuri.simplicio@grupointegrado.br`

---

## 🙏 Agradecimentos

- Docentes, preceptores e alunos do curso de Farmácia do Centro Universitário Integrado.
- Equipe de Tecnologia e Desenvolvimento do Grupo Integrado.

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
