import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

// PERFIS DE USUARIO ACEITOS PELO SISTEMA (FONTE UNICA DE VALIDACAO).
// EVITA QUE VALORES ARBITRARIOS DE `role` ALCANCEM O BANCO DE DADOS.
export const roleSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(['ADMIN', 'FARMACEUTICO', 'MEDICO', 'PACIENTE', 'ALUNO'], 'Perfil de usuário inválido'));

// STATUS VALIDOS DO CICLO DE VIDA DO AGENDAMENTO.
export const appointmentStatusSchema = z
  .string({ error: 'Status é obrigatório' })
  .trim()
  .min(1, 'Status é obrigatório')
  .toUpperCase()
  .pipe(z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], 'Status de agendamento inválido'));

// CHAVES DE PERMISSAO ACEITAS (ACOES FINE-GRAINED + RECURSOS LEGADOS).
// IMPEDE QUE CHAVES ARBITRARIAS SEJAM PERSISTIDAS E INTERPRETADAS PELO RBAC.
export const permissionKeySchema = z.enum([
  'MEDICINES_READ', 'MEDICINES_CREATE', 'MEDICINES_UPDATE', 'MEDICINES_DELETE',
  'BATCHES_READ', 'BATCHES_CREATE', 'BATCHES_UPDATE', 'BATCHES_DELETE', 'BATCHES_ADJUST',
  'DISPOSALS_READ', 'DISPOSALS_CREATE', 'DISPOSALS_UPDATE', 'DISPOSALS_REVERT',
  'PATIENTS_READ', 'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'PATIENTS_DELETE',
  'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL', 'APPOINTMENTS_DELETE',
  'SCHEDULES_READ', 'SCHEDULES_CREATE', 'SCHEDULES_UPDATE', 'SCHEDULES_DELETE',
  'USERS_READ', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
  'ACTIVITY_LOGS_READ', 'PROFILE_READ', 'PROFILE_UPDATE', 'SETTINGS_READ', 'SETTINGS_UPDATE',
  'medicines', 'batches', 'disposals', 'patients', 'appointments', 'scheduleSlots', 'users', 'activityLogs',
], 'Chave de permissão inválida');

// MAPA PARCIAL DE PERMISSOES: APENAS AS CHAVES INFORMADAS SAO VALIDADAS,
// MAS NENHUMA CHAVE DESCONHECIDA E ACEITA (EVITA POLUIR O RBAC).
export const permissionsSchema = z.partialRecord(permissionKeySchema, z.boolean());

// LIMITES DE TAMANHO PARA CAMPOS DE TEXTO LIVRE (ANTI-ABUSO DE ARMAZENAMENTO)
const NAME_MAX = 150;
const PHONE_MAX = 20;
const ADDRESS_MAX = 255;

// DATA SEM HORA EM ISO (YYYY-MM-DD) OU QUALQUER VALOR PARSEAVEL POR Date.
// GARANTE QUE `Invalid Date` NAO CHEGUE AO PRISMA.
const dateStringSchema = z.string().refine(
  (value) => !isNaN(new Date(value).getTime()),
  'Data inválida'
);

// CPF COM EXATAMENTE 11 DIGITOS (ACEITA COM OU SEM FORMATACAO)
const cpfSchema = z.string().refine(
  (value) => value.replace(/\D/g, '').length === 11,
  'CPF deve conter exatamente 11 dígitos'
);

export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
}).strict();

export const registerPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: cpfSchema,
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo').optional(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
  currentPassword: z.string().min(1, 'Senha atual é obrigatória para alteração de senha').optional(),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres').optional(),
}).strict();


export const dosageUnitEnum = z.enum(['MG', 'ML', 'G', 'MCG', 'UI']);

export const dosageSchema = z.union([
  z.object({
    value: z.number().positive('O valor da dosagem deve ser maior que zero'),
    unit: dosageUnitEnum,
  }).strict().transform((data) => {
    return `${data.value} ${data.unit}`;
  }),
  z.string().trim().refine((val) => {
    if (val.length === 0) {
      return false;
    }
    const match = val.match(/^(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|ui)$/i);
    if (match) {
      return true;
    } else {
      return false;
    }
  }, {
    message: 'Formato de dosagem inválido. Formato esperado: número e unidade permitida (MG, ML, G, MCG, UI). Exemplo: "500 MG" ou "10 ML"',
  }).transform((val) => {
    const match = val.match(/^(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|ui)$/i);
    if (match) {
      const numPart = match[1];
      const unitPart = match[2].toUpperCase();
      return `${numPart} ${unitPart}`;
    } else {
      return val;
    }
  }),
]);

const disposalReasonSchema = z.enum([
  'EXPIRED',
  'DAMAGED_PACKAGING',
  'CONTAMINATION',
  'RECALL',
  'STORAGE_ERROR',
  'OTHER',
], 'Motivo de descarte inválido');

export const disposalCreateSchema = z.object({
  batchId: z.number().int().positive('ID do lote deve ser um número positivo'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  reason: disposalReasonSchema,
  notes: z.string().trim().optional(),
}).strict();

export const disposalUpdateSchema = z.object({
  reason: disposalReasonSchema.optional(),
  notes: z.string().trim().optional(),
}).strict();

export const disposalReversalSchema = z.object({
  revertReason: z.string().trim().min(1, 'O motivo da reversão é obrigatório'),
}).strict();

export const medicineCreateSchema = z.object({
  name: z.string().min(1, 'Nome do medicamento é obrigatório'),
  activeIngredient: z.string().optional(),
  dosage: dosageSchema.optional(),
  dosageValue: z.number().positive().optional(),
  dosageUnit: dosageUnitEnum.optional(),
  minQuantity: z.number().min(0).optional(),
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
}).strict();

export const medicineUpdateSchema = z.object({
  name: z.string().optional(),
  activeIngredient: z.string().optional(),
  dosage: dosageSchema.optional(),
  dosageValue: z.number().positive().optional(),
  dosageUnit: dosageUnitEnum.optional(),
  minQuantity: z.number().min(0).optional(),
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
}).strict();

export const batchCreateSchema = z.object({
  medicineId: z.number().int().positive('ID do medicamento inválido'),
  batchNumber: z.string().min(1, 'Número do lote é obrigatório'),
  currentQuantity: z.number().int().min(0, 'Quantidade inicial não pode ser negativa'),
  expirationDate: z.string().min(1, 'Data de validade é obrigatória'),
  manufacturingDate: z.string().optional(),
  supplier: z.string().min(1, 'Fornecedor/origem é obrigatório'),
  isBlocked: z.boolean().optional(),
  blockReason: z.string().optional(),
}).strict();

export const batchUpdateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  expirationDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
  supplier: z.string().min(1).optional(),
}).strict();

export const batchBlockSchema = z.object({
  isBlocked: z.boolean(),
  blockReason: z.string().optional(),
}).strict();

export const batchAdjustmentSchema = z.object({
  newQuantity: z.number().int().min(0, 'A nova quantidade não pode ser negativa'),
  reason: z.string().min(1, 'A justificativa do ajuste é obrigatória'),
}).strict();

export const patientCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  cpf: cpfSchema,
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

export const patientUpdateSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').max(NAME_MAX, 'Nome muito longo').optional(),
  cpf: cpfSchema.optional(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

export const appointmentCreateSchema = z.object({
  scheduledDate: z.string().min(1, 'Data do agendamento é obrigatória'),
  scheduledTime: z.string().optional(),
  slotId: z.number().int().positive('Escala de atendimento é obrigatória'),
  patientId: z.number().int().positive().optional(),
  patientName: z.string().optional(),
  patientCpf: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.number().int().positive('ID do medicamento deve ser positivo'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  }).strict()).optional(),
}).strict();

export const appointmentUpdateSchema = z.object({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  slotId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  status: appointmentStatusSchema.optional(),
}).strict();

export const appointmentUpdateStatusSchema = z.object({
  status: appointmentStatusSchema,
  notes: z.string().optional(),
}).strict();

export const appointmentDispenseSchema = z.object({
  batchSelections: z.array(z.object({
    medicineId: z.number().int().positive('ID do medicamento deve ser positivo'),
    batchId: z.number().int().positive('ID do lote deve ser positivo'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  }).strict()).min(1, 'Selecione ao menos um lote para dispensação').optional(),
  notes: z.string().optional(),
}).strict();

export const appointmentRevertDispenseSchema = z.object({
  reason: z.string().trim().min(1, 'O motivo do estorno é obrigatório'),
}).strict();

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  role: roleSchema.optional(),
  // CAMPOS OPCIONAIS ACEITAM `null` (O FRONTEND ENVIA CAMPOS VAZIOS COMO null)
  registerDoc: z.string().nullish(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').nullish(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').nullish(),
  birthDate: dateStringSchema.nullish(),
  active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
}).strict();

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').max(NAME_MAX, 'Nome muito longo').optional(),
  email: z.string().email('Formato de email inválido').optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  role: roleSchema.optional(),
  // CAMPOS OPCIONAIS ACEITAM `null` (O FRONTEND ENVIA CAMPOS VAZIOS COMO null)
  registerDoc: z.string().nullish(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').nullish(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').nullish(),
  birthDate: dateStringSchema.nullish(),
  active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
}).strict();

export const userToggleActiveSchema = z.object({
  active: z.boolean(),
}).strict();

export const scheduleSlotCreateSchema = z.object({
  date: z.string().min(1, 'Data da escala é obrigatória'),
  timeSlot: z.string().min(1, 'Horário do slot é obrigatório'),
  maxCapacity: z.number().int().positive('Capacidade deve ser positiva').optional(),
  assignedToId: z.number().int().positive('Farmacêutico responsável é obrigatório'),
}).strict();

export const scheduleSlotUpdateSchema = z.object({
  date: z.string().optional(),
  timeSlot: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
}).strict();

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      let errorMessage = 'Dados inválidos na requisição';
      if (parseResult.error) {
        if (parseResult.error.issues) {
          if (parseResult.error.issues.length > 0) {
            const firstErr = parseResult.error.issues[0];
            if (firstErr) {
              if (firstErr.message) {
                errorMessage = firstErr.message;
              }
            }
          }
        }
      }
      res.status(400).json({
        error: errorMessage,
        details: parseResult.error.issues,
      });
      return;
    }
    req.body = parseResult.data;
    next();
    return;
  };
}
