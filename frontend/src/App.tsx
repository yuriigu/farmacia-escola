import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Inventory } from './pages/Inventory';
import { Appointments } from './pages/Appointments';
import { AppointmentsOverview } from './pages/AppointmentsOverview';
import { Disposals } from './pages/Disposals';
import { Withdrawals } from './pages/Withdrawals';
import { StockManagement } from './pages/StockManagement';
import { Patients } from './pages/Patients';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';
import { ProtectedRoute, RequireRole } from './components/ProtectedRoute';

// Layout aplicado às rotas protegidas: Sidebar + Header + área de conteúdo.
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Rota pública: se já estiver autenticado, redireciona para o dashboard.
function PublicOnlyRoute() {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// Componente principal com todas as rotas do sistema.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Rotas protegidas, todas com o layout padrão */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Home />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/stock-management" element={<StockManagement />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/appointments-overview" element={<AppointmentsOverview />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/disposals" element={<Disposals />} />
            <Route path="/patients" element={<Patients />} />
            <Route
              path="/admin"
              element={
                <RequireRole allowed={['ADMIN']}>
                  <AdminPanel />
                </RequireRole>
              }
            />
            {/* Qualquer rota não mapeada volta para o dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}