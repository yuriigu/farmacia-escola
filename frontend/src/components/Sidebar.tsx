import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Calendar,
  CalendarDays,
  Trash2,
  ArrowUpRight,
  Boxes,
  Pill,
  Users,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients' },
  { id: 'inventory', label: 'Estoque / Medicamentos', icon: Package, path: '/inventory' },
  { id: 'stock-management', label: 'Entrada de Lotes', icon: Boxes, path: '/stock-management' },
  { id: 'withdrawals', label: 'Retiradas (Saídas)', icon: ArrowUpRight, path: '/withdrawals' },
  { id: 'appointments-overview', label: 'Agenda (Calendário)', icon: CalendarDays, path: '/appointments-overview' },
  { id: 'appointments', label: 'Atendimentos', icon: Calendar, path: '/appointments' },
  { id: 'disposals', label: 'Descartes', icon: Trash2, path: '/disposals' },
];

const adminItems = [
  { id: 'admin', label: 'Administração', icon: ShieldCheck, path: '/admin' },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

    const userRaw = localStorage.getItem('user');
  let userRole: string | undefined;
  try {
    userRole = userRaw ? JSON.parse(userRaw)?.role : undefined;
  } catch {
    userRole = undefined;
  }

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
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {userRole === 'ADMIN' &&
          adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair do Sistema</span>
        </button>
        <div className="text-xs text-slate-500 text-center">
          v1.0.0 &bull; Unesp / Farmácia
        </div>
      </div>
    </aside>
  );
}
