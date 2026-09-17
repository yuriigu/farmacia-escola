import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// ITEM DE ABA DA BARRA DE ABAS
export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

// COLUNA DA TABELA DE DADOS REUTILIZAVEL
export interface Column<T = any> {
  header: ReactNode;
  accessorKey?: keyof T | string;
  cell?: (_item: T, _index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

// PROPRIEDADES DA TABELA DE DADOS REUTILIZAVEL
export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (_item: T, _index: number) => void;
  minWidth?: string;
  className?: string;
  footer?: ReactNode;
  keyExtractor?: (_item: T, _index: number) => string | number;
}

// PROPRIEDADES DO CABECALHO DE PAGINA
export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}