import { useCallback, useEffect, useState } from 'react';
import { Users, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, fieldClass, labelClass } from '@/components/Modal';
import { api } from '@/lib/api';
import { Patient } from '@/lib/types';

interface PatientForm {
  name: string;
  cpf: string;
  phone: string;
  birthDate: string;
  address: string;
}

const EMPTY_FORM: PatientForm = {
  name: '',
  cpf: '',
  phone: '',
  birthDate: '',
  address: '',
};

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const params = appliedSearch ? { search: appliedSearch } : {};
      const { data } = await api.get<Patient[]>('/patients', { params });
      setPatients(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao carregar pacientes.');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (patient: Patient) => {
    setEditing(patient);
    setForm({
      name: patient.name,
      cpf: patient.cpf,
      phone: patient.phone ?? '',
      birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
      address: patient.address ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, birthDate: form.birthDate || null };
      if (editing) {
        await api.put(`/patients/${editing.id}`, payload);
        toast.success('Paciente atualizado com sucesso.');
      } else {
        await api.post('/patients', payload);
        toast.success('Paciente cadastrado com sucesso.');
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar paciente.');
    }
  };

  const handleDelete = async (patient: Patient) => {
    if (!window.confirm(`Excluir o paciente "${patient.name}"?`)) return;
    try {
      await api.delete(`/patients/${patient.id}`);
      toast.success('Paciente excluído.');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao excluir paciente.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Pacientes
          </h1>
          <p className="text-sm text-slate-500">Cadastro e gestão de pacientes atendidos</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedSearch(searchInput.trim());
        }}
        className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
      >
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="w-full bg-transparent border-none text-sm text-slate-800 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Telefone</th>
              <th className="p-4">Nascimento</th>
              <th className="p-4">Retiradas</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{p.cpf}</td>
                  <td className="p-4">{p.phone ?? '—'}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {p.birthDate ? p.birthDate.slice(0, 10) : '—'}
                  </td>
                  <td className="p-4">
                    {p.withdrawalsCount ??
                      (p as unknown as { _count?: { withdrawals?: number } })._count
                        ?.withdrawals ??
                      0}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      title="Editar"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      title="Excluir"
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Paciente' : 'Novo Paciente'}
        description={editing ? 'Atualize os dados do paciente.' : 'Cadastre um novo paciente no sistema.'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelClass}>Nome completo</label>
            <input
              required
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do paciente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data de nascimento</label>
              <input
                type="date"
                className={fieldClass}
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Endereço</label>
              <input
                className={fieldClass}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Endereço"
              />
            </div>
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
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
