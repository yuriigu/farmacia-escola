"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleSlotUpdateSchema = exports.scheduleSlotCreateSchema = exports.userToggleActiveSchema = exports.userUpdateSchema = exports.userCreateSchema = exports.appointmentUpdateStatusSchema = exports.appointmentUpdateSchema = exports.appointmentCreateSchema = exports.patientUpdateSchema = exports.patientCreateSchema = exports.batchAdjustmentSchema = exports.batchBlockSchema = exports.batchUpdateSchema = exports.batchCreateSchema = exports.medicineUpdateSchema = exports.medicineCreateSchema = exports.disposalUpdateSchema = exports.disposalCreateSchema = exports.withdrawalUpdateSchema = exports.withdrawalCreateSchema = exports.dosageSchema = exports.dosageUnitEnum = exports.updateProfileSchema = exports.registerPatientSchema = exports.loginSchema = void 0;
exports.validateBody = validateBody;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Formato de email inválido'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória'),
}).strict();
exports.registerPatientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: zod_1.z.string().email('Formato de email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: zod_1.z.string().min(11, 'CPF deve conter no mínimo 11 dígitos'),
    phone: zod_1.z.string().optional(),
    birthDate: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
}).strict();
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    phone: zod_1.z.string().optional(),
    currentPassword: zod_1.z.string().min(1, 'Senha atual é obrigatória para alteração de senha').optional(),
    newPassword: zod_1.z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres').optional(),
}).strict();
exports.dosageUnitEnum = zod_1.z.enum(['MG', 'ML', 'G', 'MCG', 'UI']);
exports.dosageSchema = zod_1.z.union([
    zod_1.z.object({
        value: zod_1.z.number().positive('O valor da dosagem deve ser maior que zero'),
        unit: exports.dosageUnitEnum,
    }).strict().transform((data) => {
        return `${data.value} ${data.unit}`;
    }),
    zod_1.z.string().trim().refine((val) => {
        if (val.length === 0) {
            return false;
        }
        const match = val.match(/^(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|ui)$/i);
        if (match) {
            return true;
        }
        else {
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
        }
        else {
            return val;
        }
    }),
]);
exports.withdrawalCreateSchema = zod_1.z.object({
    patientId: zod_1.z.number().int().positive().optional(),
    patientName: zod_1.z.string().optional(),
    patientCpf: zod_1.z.string().optional(),
    medicineId: zod_1.z.number().int().positive().optional(),
    batchId: zod_1.z.number().int().positive().optional(),
    quantity: zod_1.z.number().int().positive().optional(),
    notes: zod_1.z.string().optional(),
    appointmentId: zod_1.z.number().int().positive().optional(),
    items: zod_1.z.array(zod_1.z.object({
        medicineId: zod_1.z.number().int().positive().optional(),
        batchId: zod_1.z.number().int().positive().optional(),
        quantity: zod_1.z.number().int().positive('Quantidade deve ser maior que zero'),
    }).strict()).optional(),
}).strict();
exports.withdrawalUpdateSchema = zod_1.z.object({
    notes: zod_1.z.string().optional(),
}).strict();
exports.disposalCreateSchema = zod_1.z.object({
    batchId: zod_1.z.number().int().positive('ID do lote deve ser um número positivo'),
    quantity: zod_1.z.number().int().positive('Quantidade deve ser maior que zero'),
    reason: zod_1.z.string().min(1, 'Motivo do descarte é obrigatório'),
}).strict();
exports.disposalUpdateSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
}).strict();
exports.medicineCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome do medicamento é obrigatório'),
    activeIngredient: zod_1.z.string().optional(),
    dosage: exports.dosageSchema.optional(),
    accessibleDesc: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
}).strict();
exports.medicineUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    activeIngredient: zod_1.z.string().optional(),
    dosage: exports.dosageSchema.optional(),
    accessibleDesc: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
}).strict();
exports.batchCreateSchema = zod_1.z.object({
    medicineId: zod_1.z.number().int().positive('ID do medicamento inválido'),
    batchNumber: zod_1.z.string().min(1, 'Número do lote é obrigatório'),
    currentQuantity: zod_1.z.number().int().min(0, 'Quantidade inicial não pode ser negativa'),
    expirationDate: zod_1.z.string().min(1, 'Data de validade é obrigatória'),
    manufacturingDate: zod_1.z.string().optional(),
    supplier: zod_1.z.string().min(1, 'Fornecedor/origem é obrigatório'),
    isBlocked: zod_1.z.boolean().optional(),
    blockReason: zod_1.z.string().optional(),
}).strict();
exports.batchUpdateSchema = zod_1.z.object({
    batchNumber: zod_1.z.string().min(1).optional(),
    expirationDate: zod_1.z.string().optional(),
    manufacturingDate: zod_1.z.string().optional(),
    supplier: zod_1.z.string().min(1).optional(),
}).strict();
exports.batchBlockSchema = zod_1.z.object({
    isBlocked: zod_1.z.boolean(),
    blockReason: zod_1.z.string().optional(),
}).strict();
exports.batchAdjustmentSchema = zod_1.z.object({
    newQuantity: zod_1.z.number().int().min(0, 'A nova quantidade não pode ser negativa'),
    reason: zod_1.z.string().min(1, 'A justificativa do ajuste é obrigatória'),
}).strict();
exports.patientCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    cpf: zod_1.z.string().min(11, 'CPF deve conter no mínimo 11 dígitos'),
    phone: zod_1.z.string().optional(),
    birthDate: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
}).strict();
exports.patientUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    cpf: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    birthDate: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
}).strict();
exports.appointmentCreateSchema = zod_1.z.object({
    scheduledDate: zod_1.z.string().min(1, 'Data do agendamento é obrigatória'),
    scheduledTime: zod_1.z.string().optional(),
    slotId: zod_1.z.number().int().positive().optional(),
    patientId: zod_1.z.number().int().positive().optional(),
    patientName: zod_1.z.string().optional(),
    patientCpf: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        medicineId: zod_1.z.number().int().positive('ID do medicamento deve ser positivo'),
        quantity: zod_1.z.number().int().positive('Quantidade deve ser maior que zero'),
    }).strict()).optional(),
}).strict();
exports.appointmentUpdateSchema = zod_1.z.object({
    scheduledDate: zod_1.z.string().optional(),
    scheduledTime: zod_1.z.string().optional(),
    slotId: zod_1.z.number().int().positive().optional(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
}).strict();
exports.appointmentUpdateStatusSchema = zod_1.z.object({
    status: zod_1.z.string().min(1, 'Status é obrigatório'),
    notes: zod_1.z.string().optional(),
}).strict();
exports.userCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: zod_1.z.string().email('Formato de email inválido'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória'),
    role: zod_1.z.string().optional(),
    registerDoc: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    permissions: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
}).strict();
exports.userUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Formato de email inválido').optional(),
    password: zod_1.z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
    role: zod_1.z.string().optional(),
    registerDoc: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    permissions: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
}).strict();
exports.userToggleActiveSchema = zod_1.z.object({
    active: zod_1.z.boolean(),
}).strict();
exports.scheduleSlotCreateSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, 'Data da escala é obrigatória'),
    timeSlot: zod_1.z.string().min(1, 'Horário do slot é obrigatório'),
    maxCapacity: zod_1.z.number().int().positive('Capacidade deve ser positiva').optional(),
    assignedToId: zod_1.z.number().int().positive().nullable().optional(),
}).strict();
exports.scheduleSlotUpdateSchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    timeSlot: zod_1.z.string().optional(),
    maxCapacity: zod_1.z.number().int().positive().optional(),
    assignedToId: zod_1.z.number().int().positive().nullable().optional(),
}).strict();
function validateBody(schema) {
    return (req, res, next) => {
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
