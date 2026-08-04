import { useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { usePharmacy, WithdrawalDraft } from '@/lib/PharmacyContext';
import { Modal, fieldClass, labelClass } from '@/components/Modal';

const ATTENDANTS = ['Farm. Luciana', 'Farm. Pedro', 'Farm. Ana Souza', 'Farm. João Lima'];

const EMPTY_FORM: WithdrawalDraft = {
  patientName: '',
  cpf: '',
  inventoryItemId: '',
  quantity: 0,
  dispensedBy: ATTENDANTS[0],
  notes: '',
};

export function Withdrawals() {
  const { withdrawals, inventory, registerWithdrawal, offline } = usePharmacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<WithdrawalDraft>(EMPTY_FORM);

  const selectedMedicine = inventory.find((item) => item.id === form.inventoryItemId) ?? null;
  const overBalance = Boolean(selectedMedicine) && form.quantity > (selectedMedicine?.stock ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine || overBalance || form.quantity <= 0) return;
    const ok = registerWithdrawal(form);
    if (ok) {
      setForm(EMPTY_FORM);
      setModalOpen(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-indigo-600" />
            Retiradas de Medicamentos
          </h1>
          <p className="text-sm text-slate-500">Dispensa direta e fornecimento ao paciente cadastrado</p>
        </div>

        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Retirada
        </button>
      </div>

      {offline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Servidor offline. Exibindo dados em modo de demonstração.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-4">Paciente</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Medicamento Entregue</th>
              <th className="p-4">Quantidade</th>
              <th className="p-4">Dispensado por</th>
              <th className="p-4">Data / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhuma retirada registrada.
                </td>
              </tr>
            ) : (
              withdrawals.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{item.patientName}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{item.cpf}</td>
                  <td className="p-4 font-medium text-indigo-900">{item.medicineName}</td>
                  <td className="p-4 font-bold">{item.quantity} un.</td>
                  <td className="p-4 text-slate-600">{item.dispensedBy}</td>
                  <td className="p-4 text-xs text-slate-400">{item.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Retirada de Medicamento"
        description="Registre a entrega de um medicamento ao paciente."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Paciente</label>
              <input
                required
                className={fieldClass}
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                placeholder="Nome do paciente"
              />
            </div>
            <div>
              <label className={labelClass}>CPF</label>
              <input
                required
                className={fieldClass}
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

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
            {selectedMedicine && (
              <p className="text-xs text-slate-500 mt-1.5">
                Saldo disponível:{' '}
                <span className="font-medium text-slate-700">
                  {selectedMedicine.stock} {selectedMedicine.unit}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quantidade a retirar</label>
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
                <p className="text-xs text-rose-600 mt-1.5">Quantidade maior que o saldo disponível.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Responsável pela dispensa</label>
              <select
                className={fieldClass}
                value={form.dispensedBy}
                onChange={(e) => setForm({ ...form, dispensedBy: e.target.value })}
              >
                {ATTENDANTS.map((attendant) => (
                  <option key={attendant} value={attendant}>
                    {attendant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              rows={3}
              className={`${fieldClass} resize-none`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Orientações dadas ao paciente..."
            />
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
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
            >
              Registrar Retirada
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
