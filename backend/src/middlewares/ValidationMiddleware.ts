import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF deve conter no mínimo 11 dígitos'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
});

export const withdrawalCreateSchema = z.object({
  patientId: z.number().int().positive().optional(),
  patientName: z.string().optional(),
  patientCpf: z.string().optional(),
  batchId: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  appointmentId: z.number().int().positive().optional(),
  items: z.array(z.object({
    batchId: z.number().int().positive('ID do lote deve ser positivo'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  })).optional(),
});

export const disposalCreateSchema = z.object({
  batchId: z.number().int().positive('ID do lote deve ser um número positivo'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo do descarte é obrigatório'),
});

export const medicineCreateSchema = z.object({
  name: z.string().min(1, 'Nome do medicamento é obrigatório'),
  activeIngredient: z.string().optional(),
  dosage: z.string().optional(),
  accessibleDesc: z.string().optional(),
  category: z.string().optional(),
});

export const batchCreateSchema = z.object({
  medicineId: z.number().int().positive('ID do medicamento inválido'),
  batchNumber: z.string().min(1, 'Número do lote é obrigatório'),
  currentQuantity: z.number().int().min(0, 'Quantidade inicial não pode ser negativa'),
  expirationDate: z.string().min(1, 'Data de validade é obrigatória'),
});

export function validateBody(schema: ZodSchema) {
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
