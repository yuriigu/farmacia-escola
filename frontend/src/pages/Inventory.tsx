import { useMemo, useState } from 'react';
import { Package, Search, Plus, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, fieldClass, labelClass } from '@/components/Modal';
import { usePharmacy, MedicineDraft } from '@/lib/PharmacyContext';

const UNITS = ['Caixas', 'Frascos', 'Comprimidos', 'Ampolas', 'Tubos'];

const EMPTY_DRAFT: MedicineDraft = {
  name: '',
  dosage: '',
  category: '',
  unit: UNITS[0],
  minStock: 0,
  stock: 0,
  expirationDate: '',
};

export function Inventory() {
  const { inventory, offline, addMedicine } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<MedicineDraft>(EMPTY_DRAFT);

  const categories = useMemo(() => {
    const set = new Set(inventory.map((item) => item.category).filter(Boolean));
    return ['Todos', ...Array.from(set)];
  }, [inventory]);

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addMedicine(draft);
    setDraft(EMPTY_DRAFT);
    setModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Catálogo de Medicamentos
          </h1>
          <p className="text-sm text-slate-500">Consulte o saldo disponível e validades do estoque</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Medicamento
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Buscar por nome do remédio ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none text-sm text-slate-800 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              activeCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {offline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Servidor offline. Exibindo dados em modo de demonstração.</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-4">Medicamento / Dosagem</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Estoque Atual</th>
              <th className="p-4">Validade Próxima</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.dosage}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-600">{item.category}</td>
                  <td className="p-4 font-semibold text-slate-800">
                    {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </td>
                  <td className="p-4 text-slate-600">{item.expirationDate}</td>
                  <td className="p-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Nenhum medicamento localizado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Medicamento"
        description="Cadastre um medicamento no catálogo da farmácia."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nome do medicamento</label>
            <input
              required
              className={fieldClass}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Dipirona Sódica"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Dosagem</label>
              <input
                required
                className={fieldClass}
                value={draft.dosage}
                onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                placeholder="500mg"
              />
            </div>
            <div>
              <label className={labelClass}>Categoria</label>
              <input
                required
                className={fieldClass}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Analgésico"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Qtd. inicial</label>
              <input
                type="number"
                min={0}
                required
                className={fieldClass}
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass}>Estoque mínimo</label>
              <input
                type="number"
                min={0}
                required
                className={fieldClass}
                value={draft.minStock}
                onChange={(e) => setDraft({ ...draft, minStock: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass}>Unidade</label>
              <select
                className={fieldClass}
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Data de validade</label>
            <input
              type="date"
              required
              className={fieldClass}
              value={draft.expirationDate}
              onChange={(e) => setDraft({ ...draft, expirationDate: e.target.value })}
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
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Cadastrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
