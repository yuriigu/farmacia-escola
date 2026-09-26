// enums centralizados do sistema. concentrar aqui evita strings soltas
// espalhadas pelo codigo e deixa a tipagem mais forte no typescript.
// qualquer novo valor precisa ser adicionado nesses enums e propagado
// pros schemas de validacao e pra matriz de permissoes.

// papeis de usuario. definem o que cada pessoa pode fazer no sistema
// e batem com as chaves da matriz de permissoes (role-middleware).
export enum Role {
  ADMIN = 'ADMIN',
  FARMACEUTICO = 'FARMACEUTICO',
  MEDICO = 'MEDICO',
  PACIENTE = 'PACIENTE',
  ALUNO = 'ALUNO',
}

// tipos de movimentacao de estoque. funcionam como classificacao das
// linhas de historico de cada lote, permitindo auditar entradas, saidas,
// descartes, estornos e ajustes.
export enum StockMovementType {
  ENTRY = 'ENTRY',
  DISPENSE = 'DISPENSE',
  DISPOSAL = 'DISPOSAL',
  REVERT = 'REVERT',
  ADJUSTMENT = 'ADJUSTMENT',
}

// unidades de dosagem aceitas no catalogo de medicamentos.
// usado na validacao do campo dosage e no calculo de exibicao.
export enum DosageUnit {
  MG = 'MG',
  ML = 'ML',
  G = 'G',
  MCG = 'MCG',
  UI = 'UI',
}

// status possiveis de estoque. usados tanto no nivel de lote quanto
// no nivel de medicamento (agregando os lotes), e alimentam os cards
// do painel. a ordem de prioridade na classificacao fica no
// stock-status-service, nao aqui.
export enum StockStatus {
  BLOCKED = 'BLOCKED',
  CRITICAL_EXPIRATION = 'CRITICAL_EXPIRATION',
  EXPIRED = 'EXPIRED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  IN_STOCK = 'IN_STOCK',
}