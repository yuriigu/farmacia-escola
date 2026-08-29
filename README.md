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
* **Linguagem:** TypeScript
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
* **Framework HTTP:** Express.js
* **Linguagem:** TypeScript
* **Arquitetura:** Controllers, Services, Repositories e Middlewares
* **ORM:** Prisma ORM
* **Banco de desenvolvimento:** SQLite
* **Banco de produção:** PostgreSQL
* **Autenticação:** JSON Web Tokens (JWT)
* **Hashing de senhas:** Bcrypt.js
* **Servidor Web / Proxy:** Caddy

## Estrutura do Projeto

```text
farmacia-escola/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── seed/
│   │   └── index.ts
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── administracao/
│   │   │   ├── agendamentos/
│   │   │   ├── appointments/
│   │   │   ├── calendario/
│   │   │   ├── dashboard/
│   │   │   ├── estoque/
│   │   │   ├── medicines/
│   │   │   ├── profile/
│   │   │   ├── backend/
│   │   │   └── globals.css
│   │   ├── components/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── services/
│   ├── package.json
│   └── README.md
│
├── .env.example
├── metadata.json
├── package.json
└── README.md
```

## Pré-requisitos

* Node.js 18 ou superior
* npm 9 ou superior
* Git
* PostgreSQL, caso seja utilizado como banco de produção

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/yuriigu/farmacia-escola.git
cd farmacia-escola
```

### 2. Instale as dependências

O projeto utiliza **npm workspaces**, permitindo instalar as dependências do frontend e backend a partir da raiz:

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Configure as variáveis necessárias:

```env
JWT_SECRET="farmacia-escola-secret-key-2024"
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_API_URL="/backend"
```

### 4. Configure o banco de dados

Para sincronizar o schema do Prisma:

```bash
cd backend
npm run db:push
```

Gere o Prisma Client:

```bash
npm run db:generate
```

Popule o banco de dados com os dados iniciais:

```bash
npm run db:seed
```

Depois, retorne para a raiz do projeto:

```bash
cd ..
```

## Executando o Projeto

### Desenvolvimento

Inicie a aplicação:

```bash
npm run dev
```

Acesse no navegador:

```text
http://localhost:3000
```

### Produção

Gere o build da aplicação:

```bash
npm run build
```

Depois, inicie os serviços:

```bash
npm start
```

## Credenciais de Demonstração

O sistema possui usuários pré-configurados para facilitar a exploração dos diferentes perfis e funcionalidades.

| Papel          | E-mail                            | Senha         | Descrição                                       |
| -------------- | --------------------------------- | ------------- | ----------------------------------------------- |
| `ADMIN`        | `admin@farmaciaescola.edu.br`     | `admin123`    | Configurações, usuários e auditoria             |
| `FARMACEUTICO` | `luciana@farmaciaescola.edu.br`   | `farm123`     | Estoque, lotes, dispensação e validação técnica |
| `FARMACEUTICO` | `pedro@farmaciaescola.edu.br`     | `farm123`     | Farmacêutico preceptor e gestão de horários     |
| `ALUNO`        | `ana.aluna@farmaciaescola.edu.br` | `aluno123`    | Dispensações assistidas e consulta de estoque   |
| `PACIENTE`     | `joao@email.com`                  | `paciente123` | Catálogo e agendamento de retiradas             |

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
* E-mail: `yuri.simplicio@grupointegrado.br`

## Agradecimentos

* Docentes, preceptores e alunos do curso de Farmácia do Centro Universitário Integrado.
* Equipe de Tecnologia e Desenvolvimento do Grupo Integrado.

## Licença

Este projeto é distribuído sob os termos da licença **MIT**.

Consulte o arquivo `LICENSE` para obter mais informações.