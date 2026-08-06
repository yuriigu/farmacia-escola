import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut } from 'lucide-react';

const titles: Record<string, string> = {
  '/dashboard': 'Visão Geral do Sistema',
  '/inventory': 'Estoque & Catálogo de Medicamentos',
  '/stock-management': 'Gestão e Entrada de Lotes',
  '/withdrawals': 'Saídas e Retiradas de Pacientes',
  '/appointments-overview': 'Agenda de Atendimentos',
  '/appointments': 'Consultas e Atendimentos Farmacêuticos',
  '/disposals': 'Registro e Controle de Descartes',
  '/patients': 'Cadastro de Pacientes',
  '/admin': 'Painel Administrativo de Usuários',
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const title = titles[location.pathname] || 'Farmácia Escola';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar no sistema..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
          />
        </div>

        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
            FE
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">Farmacêutico Responsável</p>
            <p className="text-xs text-slate-500">CRF/SP 12345</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="ml-1 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
