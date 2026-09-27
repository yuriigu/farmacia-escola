'use client';

// imports do react
import React, { useState } from 'react';

// imports de bibliotecas
import { Search } from 'lucide-react';

// imports locais
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Patient } from '@/types';

// props da lista de pacientes. todos os callbacks sao opcionais,
// porque o componente pode ser usado so como visualizacao (sem
// acao de selecionar nem botao de criar) em outras telas ou testes.
interface PatientListProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

// lista de pacientes com busca local. o filtro roda no cliente,
// olhando nome, cpf e cartao sus. o componente nao faz requisicao
// nenhuma: so renderiza a lista que recebeu.
export function PatientList({ patients, onSelectPatient, onNewPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // filtro de pacientes. a busca casa se o termo aparece no nome,
  // no cpf ou no cartao sus. qualquer um dos tres ja inclui o item.
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();

    // checa nome.
    if (p.name.toLowerCase().includes(term)) {
      return true;
    }

    // checa cpf.
    if (p.cpf) {
      if (p.cpf.includes(searchTerm)) {
        return true;
      }
    }

    // checa cartao sus.
    if (p.susCard) {
      if (p.susCard.includes(searchTerm)) {
        return true;
      }
    }

    return false;
  });

  // botao de novo paciente. so aparece se o callback foi passado,
  // permitindo usar o componente em telas que nao criam paciente.
  let newPatientButton: React.ReactNode = null;
  if (onNewPatient) {
    newPatientButton = (
      <Button onClick={onNewPatient}>
        Novo Paciente
      </Button>
    );
  }

  // conteudo da lista. quando nao ha resultado, mostra um empty state;
  // senao, renderiza cada paciente com cpf, sus e telefone.
  let patientListContent: React.ReactNode = null;
  if (filteredPatients.length === 0) {
    patientListContent = (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nenhum paciente encontrado.
      </div>
    );
  } else {
    patientListContent = (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredPatients.map((patient) => {
          // cpf com fallback quando nao veio.
          let cpfText = 'Não informado';
          if (patient.cpf) {
            cpfText = patient.cpf;
          } else {
            cpfText = 'Não informado';
          }

          // cartao sus com fallback quando nao veio.
          let susText = 'Não informado';
          if (patient.susCard) {
            susText = patient.susCard;
          } else {
            susText = 'Não informado';
          }

          // telefone so renderiza se existir.
          let phoneElement: React.ReactNode = null;
          if (patient.phone) {
            phoneElement = (
              <span className="text-xs text-slate-400">{patient.phone}</span>
            );
          }

          return (
            <div
              key={patient.id}
              data-testid={`patient-item-${patient.id}`}
              className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer"
              onClick={() => {
                // clique no item dispara o onselect quando passado.
                // sem onselect, o item fica so leitura.
                if (onSelectPatient) {
                  onSelectPatient(patient);
                }
              }}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {patient.name}
                </p>
                <p className="text-xs text-slate-500">
                  CPF: {cpfText} • SUS: {susText}
                </p>
              </div>
              {phoneElement}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card data-testid="patient-list" className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Pacientes Cadastrados
        </CardTitle>
        {newPatientButton}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF ou cartão SUS..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="pl-9"
            aria-label="Buscar pacientes"
          />
        </div>

        {patientListContent}
      </CardContent>
    </Card>
  );
}