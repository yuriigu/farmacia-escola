'use client';

// IMPORTS DO REACT
import React, { useState } from 'react';

// IMPORTS DE BIBLIOTECAS
import { Search } from 'lucide-react';

// IMPORTS LOCAIS
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Patient } from '@/lib/Types';

// INTERFACE DAS PROPRIEDADES DA LISTA DE PACIENTES
interface PatientListProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

// COMPONENTE DA LISTA DE PACIENTES
export function PatientList({ patients, onSelectPatient, onNewPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // FILTRAGEM VERBOSA DE PACIENTES
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();

    // VERIFICANDO NOME
    if (p.name.toLowerCase().includes(term)) {
      return true;
    }

    // VERIFICANDO CPF
    if (p.cpf) {
      if (p.cpf.includes(searchTerm)) {
        return true;
      }
    }

    // VERIFICANDO CARTAO SUS
    if (p.susCard) {
      if (p.susCard.includes(searchTerm)) {
        return true;
      }
    }

    return false;
  });

  // BOTAO DE NOVO PACIENTE
  let newPatientButton: React.ReactNode = null;
  if (onNewPatient) {
    newPatientButton = (
      <Button onClick={onNewPatient} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        Novo Paciente
      </Button>
    );
  }

  // CONTEUDO DA LISTA DE PACIENTES
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
          // DETERMINANDO TEXTO DO CPF
          let cpfText = 'Não informado';
          if (patient.cpf) {
            cpfText = patient.cpf;
          } else {
            cpfText = 'Não informado';
          }

          // DETERMINANDO TEXTO DO CARTAO SUS
          let susText = 'Não informado';
          if (patient.susCard) {
            susText = patient.susCard;
          } else {
            susText = 'Não informado';
          }

          // RENDERIZANDO TELEFONE DO PACIENTE
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
