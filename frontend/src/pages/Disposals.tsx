import { useMemo, useState } from 'react';
import { Trash2, AlertCircle, Plus, PackageX, Undo2, Info } from 'lucide-react';
import { usePharmacy, DisposalDraft } from '@/lib/PharmacyContext';
import { Modal, fieldClass, labelClass } from '@/components/Modal';

const REASONS = ['Medicamento Vencido', 'Embalagem Danificada', 'Recolhimento ANVISA', 'Outro'];

const EMPTY_FORM: DisposalDraft = {
  inventoryItemId: '',
  quantity: 0,
  reason: REASONS[0],
};

const DAYS_THRESHOLD = 30;

export function Disposals() {
  const { disposals, inventory, offline, registerDisposal, revertDisposal } = usePharmacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DisposalDraft>(EMPTY_FORM);
  const [reverting, setReverting] = useState<string | null>(null);

  const selectedMedicine = inventory.find((item) => item.id === form.inventoryItemId) ?? null;
  const overBalance = Boolean(selectedMedicine) && form.quantity > (selectedMedicine?.stock ?? 0);

  const alerts = useMemo(() => {
    const now = Date.now();
    return inventory
      .filter((item) => {
        if (item.stock <= 0) return true;
        if (!item.expirationDate) return false;
        const days = Math.ceil((new Date(item.expirationDate).getTime() - now) / (1000 * 60 * 60 * 24));
        return days < DAYS_THRESHOLD;
      })
      .slice(0, 6);
  }, [inventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine || overBalance || form.quantity <= 0) return;
    const ok = await registerDisposal(form);
    if (ok) {
      setForm(EMPTY_FORM);
      setModalOpen(false);
    }
  };

  const revertingDisposal = disposals.find((d) => d.id === reverting) ?? null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-600" />
            Registro de Descartes
          </h1>
          <p className="text-sm text-slate-500">Histórico de descarte seguro de insumos e medicamentos</p>
        </div>

        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium text-sm hover:bg-rose-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Descarte
        </button>
      </div>

      {offline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Servidor offline (localhost:3001). Exibindo dados demonstrativos em modo offline.</span>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Alertas ativos</h3>
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl text-sm">
            Nenhum alerta de validade ou estoque no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((item) => {
              const isEmpty = item.stock <= 0;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    isEmpty ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <span
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isEmpty ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isEmpty ? <PackageX className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {item.name} {item.dosage}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${isEmpty ? 'text-rose-700' : 'text-amber-700'}`}>
                      {isEmpty ? 'Sem unidades disponíveis.' : `Validade próxima: ${item.expirationDate}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{item.stock} {item.unit} em estoque</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Histórico de descartes</h3>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5" />
            Descartes registrados debitam o estoque automaticamente
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-4">Medicamento / Lote</th>
                <th className="p-4">Paciente (Se Houver)</th>
                <th className="p-4">Quantidade</th>
                <th className="p-4">Motivo do Descarte</th>
                <th className="p-4">Registrado por</th>
                <th className="p-4">Data</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum registro de descarte encontrado.
                  </td>
                </tr>
              ) : (
                disposals.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.reverted ? 'bg-slate-50/60 text-slate-400' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-4 font-semibold text-slate-900">
                      {item.batch?.medicine?.name ?? 'Medicamento Não Informado'}
                      <span className="block text-xs font-normal text-slate-400">
                        Lote: {item.batch?.code ?? 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">{item.patient?.name ?? '—'}</td>
                    <td className="p-4 font-medium">{item.batch?.quantity ?? '—'} un.</td>
                    <td className="p-4 font-medium text-rose-700">
                      {item.reason ?? 'Não especificado'}
                      {item.reverted && (
                        <span className="block text-[11px] font-medium text-indigo-600 mt-0.5">
                          Descarte revertido
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{item.user?.name ?? 'Sistema'}</td>
                    <td className="p-4 text-slate-500 text-xs">{item.createdAt ?? '—'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setReverting(item.id)}
                        disabled={item.reverted}
                        title={item.reverted ? 'Descarte já revertido' : 'Reverter descarte'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 border border-slate-200 text-xs font-medium hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Reverter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Descarte"
        description="A quantidade informada será retirada do estoque e registrada no histórico."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Medicamento</label>
            <select
              required
              className={fieldClass}
              value={form.inventoryItemId}
              onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}
            >
              <option value="">Selecione um medicamento...</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id} disabled={item.stock === 0}>
                  {item.name} {item.dosage} — saldo: {item.stock} {item.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Motivo do descarte</label>
            <select
              className={fieldClass}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            >
              {REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Quantidade descartada</label>
            <input
              type="number"
              min={1}
              max={selectedMedicine?.stock}
              required
              className={fieldClass}
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
            {overBalance && (
              <p className="text-xs text-rose-600 mt-1.5">
                A quantidade não pode ser maior que o saldo disponível.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={overBalance || !selectedMedicine}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-60"
            >
              Confirmar Descarte
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(reverting)}
        onClose={() => setReverting(null)}
        title="Reverter Descarte"
        description="Use esta ação quando o descarte tiver sido registrado por engano."
      >
        {revertingDisposal && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="font-medium text-slate-900 text-sm">
                {revertingDisposal.batch?.medicine?.name} {revertingDisposal.batch?.medicine?.dosage}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Serão restauradas{' '}
                <span className="font-medium">{revertingDisposal.batch?.quantity} un.</span> ao estoque.
              </p>
              <p className="text-xs text-slate-500 mt-1">Motivo original: {revertingDisposal.reason}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReverting(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  revertDisposal(revertingDisposal.id);
                  setReverting(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Confirmar Reversão
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
