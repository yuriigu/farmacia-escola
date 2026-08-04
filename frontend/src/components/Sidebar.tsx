import { LayoutDashboard, Package, Calendar, CalendarDays, Trash2, ArrowUpRight, Boxes, Pill } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'inventory', label: 'Estoque / Medicamentos', icon: Package },
    { id: 'stock-management', label: 'Entrada de Lotes', icon: Boxes },
    { id: 'withdrawals', label: 'Retiradas (Saídas)', icon: ArrowUpRight },
    { id: 'appointments-overview', label: 'Agenda (Calendário)', icon: CalendarDays },
    { id: 'appointments', label: 'Atendimentos', icon: Calendar },
    { id: 'disposals', label: 'Descartes', icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      <div className="p-5 flex items-center gap-3 border-b border-slate-800">
        <div className="p-2 bg-emerald-600 rounded-xl text-white">
          <Pill className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">Farmácia Escola</h1>
          <p className="text-xs text-slate-400">Sistema de Gestão</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.0.0 &bull; Unesp / Farmácia
      </div>
    </aside>
  );
}
