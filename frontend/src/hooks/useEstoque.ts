import { useState, useEffect, useCallback } from 'react';
import { estoqueService } from '@/services/estoqueService';
import { Medicine, Batch, Withdrawal, Disposal } from '@/types';
import { toast } from 'sonner';

export function useEstoque() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsData, batchData, withData, dispData] = await Promise.all([
        estoqueService.getMedicines(),
        estoqueService.getBatches(),
        estoqueService.getWithdrawals(),
        estoqueService.getDisposals(),
      ]);
      setMedicines(medsData);
      setBatches(batchData);
      setWithdrawals(withData);
      setDisposals(dispData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do estoque');
      toast.error('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addMedicine = async (data: Partial<Medicine>) => {
    try {
      const newMed = await estoqueService.createMedicine(data);
      setMedicines(prev => [...prev, newMed]);
      toast.success('Medicamento cadastrado com sucesso!');
      return newMed;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar medicamento');
      throw err;
    }
  };

  const addBatch = async (data: Partial<Batch>) => {
    try {
      const newBatch = await estoqueService.createBatch(data);
      setBatches(prev => [...prev, newBatch]);
      toast.success('Lote registrado com sucesso!');
      return newBatch;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar lote');
      throw err;
    }
  };

  return {
    medicines,
    batches,
    withdrawals,
    disposals,
    loading,
    error,
    refresh: fetchAll,
    addMedicine,
    addBatch,
  };
}