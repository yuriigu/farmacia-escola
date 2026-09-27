// imports locais
import type { Role } from '@/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

// props do cracha de papel de usuario. o papel e opcional porque
// o componente tem fallback pra "paciente"/"usuario" quando nao vem.
interface RoleBadgeProps {
  role?: string | null;
  className?: string;
}

// cracha de papel (admin, farmaceutico, medico, aluno, paciente).
// exibe um badge colorido com o rotulo do papel. tanto o texto
// quanto a cor vem dos mapas de constants (role_labels e role_colors),
// com fallback pra "usuario" e pro cinza neutro quando o papel
// nao esta no mapa.
export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  // normaliza o papel em maiusculo pra bater com as chaves dos
  // mapas. quando nao veio, assume "paciente".
  let rawRole = 'PACIENTE';
  if (role) {
    rawRole = role.toUpperCase();
  } else {
    rawRole = 'PACIENTE';
  }
  const r = rawRole as Role;

  // resolve o rotulo amigavel. prioriza o mapa de labels; se nao
  // achar, usa o proprio valor cru do papel; se nao houver, cai
  // em "usuario".
  let label = 'Usuário';
  if (ROLE_LABELS[r]) {
    label = ROLE_LABELS[r];
  } else if (role) {
    label = role;
  } else {
    label = 'Usuário';
  }

  // resolve as classes de cor do badge. o fallback e cinza neutro
  // (bom em claro e escuro).
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  if (ROLE_COLORS[r]) {
    colorClass = ROLE_COLORS[r];
  } else {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  // junta as classes base com as cores e o classname externo
  // (permite ajustes visuais pontuais pelo consumidor).
  const combinedClassName = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + colorClass + ' ' + className;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
}