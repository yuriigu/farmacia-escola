// barrel central de tipos do frontend. concentra todos os tipos
// num unico ponto de import, entao o resto do codigo pode fazer:
//   import { User, Appointment, ... } from '@/types';
// em vez de importar arquivo por arquivo. isso facilita renomear
// ou mover tipos depois, porque so muda aqui.
//
// cada export * reexporta tudo que o arquivo referenciado expoe.
// a ordem nao importa pra typescript, e como sao so tipos, nao
// ha efeito colateral em runtime.
export * from './user';
export * from './patient';
export * from './medicine';
export * from './stock';
export * from './appointment';
export * from './disposal';
export * from './rbac';
export * from './api';
export * from './ui';