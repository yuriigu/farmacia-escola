# Farmácia Escola — Sistema de Gestão Farmacêutica

Sistema de gestão para farmácias universitárias desenvolvido como Trabalho de Conclusão de Curso (TCC). O projeto centraliza o controle de estoque, retiradas por pacientes, descartes de medicamentos e agendamentos farmacêuticos em uma única plataforma.

## Problema Tratado

O atendimento e o gerenciamento dos serviços da Farmácia Escola são realizados de forma analógica e descentralizada, sem o suporte de um meio oficial online para interagir com a comunidade. Isso resulta em:

- **Inacessibilidade à informação** — pacientes não conseguem consultar a disponibilidade de medicamentos antes de se deslocar até a unidade
- **Ineficiência logística** — faltas em consultas variam entre 22% e 30%, gerando filas e desperdício de recursos
- **Desinformação em saúde** — mais de 90% dos brasileiros buscam informações de saúde na internet, mas encontram linguagem técnica inacessível

## Design Thinking

### Imersão
- **Desk Research**: Mapeamento de farmácias universitárias (USP, UFMG) revelou fragmentação da informação e falta de agendamento digital
- **Persona**: Maria do Carmo, 67 anos, aposentada com mobilidade reduzida que precisa retirar medicamentos mensais e agendar consultas
- **Mapa de Empatia**: Dor principal é a incerteza sobre disponibilidade de medicamentos antes do deslocamento

### Ideação
Brainstorming classificou funcionalidades em MVP, Backlog e Descartadas:

| Ideia | Status |
|---|---|
| Visualização de Estoque | MVP |
| Agendamento Online | MVP |
| Descrição Acessível do Medicamento | MVP |
| Painel Administrativo | MVP |
| Lista de "Meus Medicamentos" | MVP |
| Confirmação via WhatsApp | Backlog |
| Alerta de Validade Próxima | Backlog |
| Dashboard de Impacto Social | Backlog |
| Aplicativo Nativo | Descartada |

### Prototipação
Protótipos desenvolvidos no Figma para validação das telas principais: Login, Buscar Remédios, Estoque, Agendar Consulta e Visão Geral de Agendamentos.

## Lean Canvas

| Problema | Solução | Proposta Única de Valor |
|---|---|---|
| Inacessibilidade à informação em tempo real | Consulta de Estoque online | Vínculo institucional com a universidade |
| Ineficiência logística no agendamento | Agendamento Inteligente com confirmação | Confiança da comunidade |
| Desinformação sobre medicamentos | Descrição Acessível com linguagem simples | Assistência gratuita e educativa |

**Segmento de Clientes**: Pacientes do sistema público, pessoas com doenças crônicas e mobilidade reduzida

**Canais**: Portal oficial do Centro Universitário Integrado, redes sociais, cartazes com QR Code na unidade

**Métricas Chave**: Acessos ao estoque, consultas agendadas, redução de faltas

**Estrutura de Custos**: Hospedagem, manutenção, desenvolvimento e capacitação

**Fluxos de Receita**: Editais de fomento, investimento institucional, redução de custos operacionais

## Startup

**Nome**: Farmácia Escola

**Missão**: Promover o acesso à informação em saúde e aos serviços farmacêuticos por meio de soluções digitais acessíveis, contribuindo para o bem-estar da comunidade e para a formação acadêmica de qualidade.

**Visão**: Ser referência regional em inovação tecnológica aplicada à assistência farmacêutica universitária, funcionando como intersecção entre comunidade, saúde e educação.

**Valores**: Compromisso social, acessibilidade, ética, inovação, educação e humanização.

**Área de Atuação**: Tecnologia aplicada à saúde e educação, com foco em soluções digitais para assistência farmacêutica universitária.

## Funcionalidades

- Catálogo de medicamentos com busca e filtro por categoria
- Gestão de lotes com controle de quantidade e validade
- Alertas automáticos de estoque baixo e lotes próximos ao vencimento
- Registro de retiradas por paciente com baixa automática no estoque
- Registro de descartes com motivo e rastreabilidade por lote e responsável
- Agenda de atendimentos farmacêuticos com calendário semanal
- Dashboard com indicadores de estoque e atividade recente
- Controle de acesso por perfil (ADMIN / FARMACEUTICO / ALUNO)
- Fallback com dados locais quando a API estiver indisponível

## Tecnologias

### Backend

| Tecnologia | Função |
|---|---|
| Node.js 22 + Express 5 | Servidor HTTP |
| TypeScript 7 | Linguagem principal |
| MySQL 8 | Banco de dados relacional |
| Prisma 5 | ORM e migrations |
| jsonwebtoken 9 | Autenticação JWT |
| bcryptjs 3 | Hash de senhas |
| zod 4 | Validação de dados |
| Docker / Docker Compose | Containerização da infraestrutura |

### Frontend

| Tecnologia | Função |
|---|---|
| React 18 | Biblioteca de UI |
| TypeScript 5.6 | Tipagem estática |
| Vite 5 | Build tool |
| Tailwind CSS v4 | Estilização |
| Radix UI | Componentes acessíveis |
| React Hook Form + Zod | Formulários e validação |
| Axios | Cliente HTTP |
| TanStack Query 5 | Cache e estado de servidor |
| date-fns | Manipulação de datas |
| Lucide React | Ícones |

## Estrutura do Repositório

```
farmacia-escola/
  backend/             API REST (Node.js + Express + Prisma)
  frontend/            SPA (React + Vite)
  docker-compose.yml   MySQL 8 + Adminer
```

## Como Executar

### Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 22+

### 1. Suba a infraestrutura

```bash
docker compose up -d
```

Inicia MySQL 8 na porta `3306` e Adminer na porta `8080`.

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API disponível em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Licença

MIT
