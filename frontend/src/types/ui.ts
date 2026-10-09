import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// item de aba da barra de abas (tabbar).
// o icon e opcional (quando nao vem, a aba so mostra o label)
// e o badge tambem (usado pra contagem, tipo "5" do lado do nome).
export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

// coluna da tabela de dados reutilizavel (datatable).
// cada coluna define o header e, pra montar o valor da celula,
// ou um accessorkey (busca direta no item) ou uma funcao cell
// (render custom). align, width e as duas classnames controlam
// o layout fino.
export interface Column<T = any> {
  header: ReactNode;
  accessorKey?: keyof T | string;
  cell?: (_item: T, _index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

// propriedades da tabela de dados reutilizavel.
// cobrem os tres estados do datatable (loading, vazio e com dados),
// mais a configuracao de colunas e a acao opcional de clique.
// o keyextractor permite customizar a chave da linha (por padrao
// o componente tenta item.id e, se nao houver, cai no index).
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

// propriedades do cabecalho de pagina (pageheader).
// titulo e obrigatorio; descricao, icone, badge e acoes sao
// opcionais, permitindo o mesmo componente servir pra telas
// simples e complexas.
export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}