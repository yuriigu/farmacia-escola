import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// utilitario de concatenacao de classes. junta duas coisas:
// - clsx: aceita strings, arrays, objetos condicionais e valores
//   falsy/null/undefined, filtrando o que nao interessa.
// - twmerge: resolve conflitos de classes do tailwind, mantendo
//   a ultima (ex: "p-2 p-4" vira "p-4"). sem isso, uma classe
//   passada por classname podia ser sobrescrita pela base do
//   componente por ordem de declaracao, nao por intencao.
// e o cn usado em todos os componentes do design system.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}