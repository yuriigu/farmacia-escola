import { Package, Calendar, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { usePharmacy } from '@/lib/PharmacyContext';

interface HomeProps {
  setActiveTab?: (tab: string) => void;
}

export function Home({ setActiveTab }: HomeProps) {
  const { inventory, appointments, withdrawals, disposals } = usePharmacy();

  const totalItems = inventory.reduce((sum, item) => sum + item.stock, 0);
  const alertCount = inventory.filter((item) => item.status !== 'ok').length;
  const appointmentsToday = appointments.filter((a) => a.status !== 'cancelado').length;

  const stats = [
    {
      title: 'Itens em Estoque',
      value: totalItems.toLocaleString('pt-BR'),
      icon: Package,
      color: 'text-emerald-600 bg-emerald-50',
      tab: 'inventory',
    },
    {
      title: 'Atendimentos Hoje',
      value: String(appointmentsToday),
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50',
      tab: 'appointments',
    },
    {
      title: 'Retiradas no Mês',
      value: String(withdrawals.length),
      icon: ArrowUpRight,
      color: 'text-indigo-600 bg-indigo-50',
      tab: 'withdrawals',
    },
    {
      title: 'Alertas de Estoque',
      value: String(alertCount),
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50',
      tab: 'disposals',
    },
  ];

  const recentAlerts = inventory
    .filter((item) => item.status !== 'ok')
    .slice(0, 3)
    .map((item) => ({
      name: `${item.name} ${item.dosage}`,
      status: item.status,
      desc:
        item.status === 'critical'
          ? `Apenas ${item.stock} ${item.unit} restantes`
          : item.status === 'expired'
            ? `Venceu em ${item.expirationDate}`
            : 'Chegando ao limite mínimo',
    }));

  const recentDisposals = disposals.slice(0, 1).map((d) => ({
    title: 'Descarte registrado',
    detail: `${d.batch?.medicine?.name ?? 'Medicamento'} - ${d.reason ?? ''}`,
    time: d.createdAt ?? '',
  }));

  const recentWithdrawals = withdrawals.slice(0, 2).map((w) => ({
    title: 'Retirada efetuada',
    detail: `${w.patientName} &bull; ${w.medicineName}`,
    time: w.date,
  }));

  const activities = [...recentWithdrawals, ...recentDisposals].slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab?.(s.tab)}
              className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className={`p-3 rounded-xl ${s.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{s.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Atividades Recentes na Farmácia
          </h3>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma atividade registrada ainda.</p>
            ) : (
              activities.map((act, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{act.title}</p>
                    <p className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: act.detail }} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{act.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas de Atenção
          </h3>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum alerta no momento.</p>
            ) : (
              recentAlerts.map((item, index) => (
                <div key={index} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{item.name}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
