import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
}).strict();

export const registerPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF deve conter no mínimo 11 dígitos'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  phone: z.string().optional(),
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

export const withdrawalCreateSchema = z.object({
  patientId: z.number().int().positive().optional(),
  patientName: z.string().optional(),
  patientCpf: z.string().min(1, 'CPF do paciente é obrigatório'),
  medicineId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  appointmentId: z.number().int().positive().optional(),
  items: z.array(z.object({
    medicineId: z.number().int().positive().optional(),
    batchId: z.number().int().positive().optional(),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  }).strict()).optional(),
}).strict();

export const withdrawalUpdateSchema = z.object({
  notes: z.string().optional(),
}).strict();

export const withdrawalCancelSchema = z.object({
  cancelReason: z.string().trim().min(1, 'O motivo do cancelamento é obrigatório'),
}).strict();

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
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
}).strict();

export const medicineUpdateSchema = z.object({
  name: z.string().optional(),
  activeIngredient: z.string().optional(),
  dosage: dosageSchema.optional(),
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
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf: z.string().min(11, 'CPF deve conter no mínimo 11 dígitos'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
}).strict();

export const patientUpdateSchema = z.object({
  name: z.string().optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
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
  status: z.string().optional(),
}).strict();

export const appointmentUpdateStatusSchema = z.object({
  status: z.string().min(1, 'Status é obrigatório'),
  notes: z.string().optional(),
}).strict();

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  role: z.string().optional(),
  registerDoc: z.string().optional(),
  phone: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
}).strict();

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Formato de email inválido').optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  role: z.string().optional(),
  registerDoc: z.string().optional(),
  phone: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
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
