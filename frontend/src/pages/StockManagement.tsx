import { useState } from 'react';
import { Boxes, Plus, ArrowDownCircle } from 'lucide-react';
import { usePharmacy, BatchEntryDraft } from '@/lib/PharmacyContext';

const EMPTY_FORM: BatchEntryDraft = {
  medicineName: '',
  dosage: '',
  batchCode: '',
  quantity: 0,
  expirationDate: '',
  supplier: '',
};

export function StockManagement() {
  const { registerBatchEntry } = usePharmacy();
  const [form, setForm] = useState<BatchEntryDraft>(EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineName || !form.quantity) return;
    registerBatchEntry(form);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            Entrada de Lotes e Controle de Estoque
          </h1>
          <p className="text-sm text-slate-500">Cadastre novas remessas de medicamentos recebidas do distribuidor</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
          Formulário de Entrada de Nota / Lote
        </h3>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medicamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Paracetamol 750mg"
                value={form.medicineName}
                onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Se o nome já existir no catálogo, a quantidade é somada ao estoque atual.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Lote</label>
              <input
                type="text"
                required
                placeholder="Ex: LOT-2026-08A"
                value={form.batchCode}
                onChange={(e) => setForm({ ...form, batchCode: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dosagem</label>
              <input
                type="text"
                placeholder="Ex: 750mg"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantidade Recebida</label>
              <input
                type="number"
                min={1}
                required
                placeholder="0"
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Validade</label>
              <input
                type="date"
                required
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor / Origem</label>
            <input
              type="text"
              placeholder="Ex: Distribuidora MedSul Ltda"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Salvar Lote no Estoque
          </button>
        </form>
      </div>
    </div>
  );
}
