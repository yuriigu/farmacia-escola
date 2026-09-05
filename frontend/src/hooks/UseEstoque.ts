// IMPORTS DO REACT
import { useState, useEffect, useCallback } from 'react';

// IMPORTS DE BIBLIOTECAS
import { toast } from 'sonner';

// IMPORTS LOCAIS
import { estoqueService } from '@/services/EstoqueService';
import { Medicine, Batch, Withdrawal, Disposal } from '@/types';

// HOOK PERSONALIZADO PARA GERENCIAR ESTOQUE
export function useEstoque() {
  // DECLARACAO DOS ESTADOS
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FUNCAO PARA BUSCAR TODOS OS DADOS DO ESTOQUE
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const responses = await Promise.all([
        estoqueService.getMedicines(),
        estoqueService.getBatches(),
        estoqueService.getWithdrawals(),
        estoqueService.getDisposals(),
      ]);
      const medsData = responses[0];
      const batchData = responses[1];
      const withData = responses[2];
      const dispData = responses[3];

      setMedicines(medsData);
      setBatches(batchData);
      setWithdrawals(withData);
      setDisposals(dispData);
    } catch (err: any) {
      let errorMessage = 'Erro ao carregar dados do estoque';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao carregar dados do estoque';
        }
      } else {
        errorMessage = 'Erro ao carregar dados do estoque';
      }
      setError(errorMessage);
      toast.error('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  }, []);

  // EFEITO PARA CARREGAR DADOS INICIAIS
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await fetchAll();
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchAll]);

  // FUNCAO PARA ADICIONAR NOVO MEDICAMENTO
  const addMedicine = async (data: Partial<Medicine>) => {
    try {
      const newMed = await estoqueService.createMedicine(data);
      setMedicines((prev) => {
        const updated = [...prev, newMed];
        return updated;
      });
      toast.success('Medicamento cadastrado com sucesso!');
      return newMed;
    } catch (err: any) {
      let errorMessage = 'Erro ao cadastrar medicamento';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao cadastrar medicamento';
        }
      } else {
        errorMessage = 'Erro ao cadastrar medicamento';
      }
      toast.error(errorMessage);
      throw err;
    }
  };

  // FUNCAO PARA ADICIONAR NOVO LOTE
  const addBatch = async (data: Partial<Batch>) => {
    try {
      const newBatch = await estoqueService.createBatch(data);
      setBatches((prev) => {
        const updated = [...prev, newBatch];
        return updated;
      });
      toast.success('Lote registrado com sucesso!');
      return newBatch;
    } catch (err: any) {
      let errorMessage = 'Erro ao cadastrar lote';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao cadastrar lote';
        }
      } else {
        errorMessage = 'Erro ao cadastrar lote';
      }
      toast.error(errorMessage);
      throw err;
    }
  };

  // RETORNO DO HOOK
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