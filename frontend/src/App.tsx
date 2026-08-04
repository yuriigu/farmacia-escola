import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Inventory } from './pages/Inventory';
import { Appointments } from './pages/Appointments';
import { AppointmentsOverview } from './pages/AppointmentsOverview';
import { Disposals } from './pages/Disposals';
import { Withdrawals } from './pages/Withdrawals';
import { StockManagement } from './pages/StockManagement';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const titles: Record<string, string> = {
    dashboard: 'Visão Geral do Sistema',
    inventory: 'Estoque & Catálogo de Medicamentos',
    'stock-management': 'Gestão e Entrada de Lotes',
    withdrawals: 'Saídas e Retiradas de Pacientes',
    'appointments-overview': 'Agenda de Atendimentos',
    appointments: 'Consultas e Atendimentos Farmacêuticos',
    disposals: 'Registro e Controle de Descartes',
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Home setActiveTab={setActiveTab} />;
      case 'inventory':
        return <Inventory />;
      case 'stock-management':
        return <StockManagement />;
      case 'withdrawals':
        return <Withdrawals />;
      case 'appointments-overview':
        return <AppointmentsOverview onSelectDay={() => setActiveTab('appointments')} />;
      case 'appointments':
        return <Appointments />;
      case 'disposals':
        return <Disposals />;
      default:
        return <Home setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={titles[activeTab] || 'Farmácia Escola'} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
