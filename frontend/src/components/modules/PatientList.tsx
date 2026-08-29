'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { Patient } from '@/lib/types';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

export function PatientList({ patients, onSelectPatient, onNewPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cpf && p.cpf.includes(searchTerm)) ||
    (p.susCard && p.susCard.includes(searchTerm))
  );

  return (
    <Card data-testid="patient-list" className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Pacientes Cadastrados
        </CardTitle>
        {onNewPatient && (
          <Button onClick={onNewPatient} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Novo Paciente
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF ou cartão SUS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label="Buscar pacientes"
          />
        </div>

        {filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nenhum paciente encontrado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                data-testid={`patient-item-${patient.id}`}
                className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer"
                onClick={() => onSelectPatient?.(patient)}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {patient.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    CPF: {patient.cpf || 'Não informado'} • SUS: {patient.susCard || 'Não informado'}
                  </p>
                </div>
                {patient.phone && (
                  <span className="text-xs text-slate-400">{patient.phone}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
