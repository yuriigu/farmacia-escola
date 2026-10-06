import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

// perfis de usuario aceitos pelo sistema. e a fonte unica de validacao
// do campo role, evitando que valores arbitrarios cheguem no banco.
export const roleSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(['ADMIN', 'FARMACEUTICO', 'MEDICO', 'PACIENTE', 'ALUNO'], 'Perfil de usuário inválido'));

// status validos do ciclo de vida do agendamento.
export const appointmentStatusSchema = z
  .string({ error: 'Status é obrigatório' })
  .trim()
  .min(1, 'Status é obrigatório')
  .toUpperCase()
  .pipe(z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], 'Status de agendamento inválido'));

// chaves de permissao aceitas (acoes fine-grained + recursos legados).
// trava o que pode ser persistido no campo permissions e interpretado
// pelo rbac, evitando chaves desconhecidas circulando pelo sistema.
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

// mapa parcial de permissoes: so as chaves informadas sao validadas,
// mas nenhuma chave desconhecida passa (evita poluir o rbac).
export const permissionsSchema = z.partialRecord(permissionKeySchema, z.boolean());

// limites de tamanho pra campos de texto livre.
// servem como anti-abuso de armazenamento e como trava simples de payload.
const NAME_MAX = 150;
const PHONE_MAX = 20;
const ADDRESS_MAX = 255;

// aceita data sem hora em iso (yyyy-mm-dd) ou qualquer string
// que o Date consiga parsear. a ideia e barrar Invalid Date
// antes de chegar no prisma.
const dateStringSchema = z.string().refine(
  (value) => !isNaN(new Date(value).getTime()),
  'Data inválida'
);

// cpf com exatamente 11 digitos, aceitando com ou sem formatacao
// (ponto, traco, etc). a checagem ignora os nao-digitos.
const cpfSchema = z.string().refine(
  (value) => value.replace(/\D/g, '').length === 11,
  'CPF deve conter exatamente 11 dígitos'
);

// schema do login. apenas email valido e senha nao vazia.
// strict() bloqueia campos extras no body.
export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
}).strict();

// schema de cadastro publico de paciente. cria o usuario junto
// com os dados do paciente no mesmo fluxo.
export const registerPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: cpfSchema,
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

// schema de atualizacao do proprio perfil. todos os campos sao opcionais,
// mas pra trocar de senha o usuario precisa informar a atual.
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo').optional(),
  email: z.string().email('Formato de email inválido').optional(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
  currentPassword: z.string().min(1, 'Senha atual é obrigatória para alteração de senha').optional(),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres').optional(),
}).strict();


// unidades de dosagem aceitas no catalogo de medicamentos.
export const dosageUnitEnum = z.enum(['MG', 'ML', 'G', 'MCG', 'UI']);

// schema de dosagem que aceita dois formatos:
// - objeto { value, unit } vindo do front
// - string tipo "500 MG" ou "10 ml"
// em ambos os casos, normaliza pra string no padrao "valor UNIDADE" maiuscula.
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

// motivos validos de descarte de lote.
const disposalReasonSchema = z.enum([
  'EXPIRED',
  'DAMAGED_PACKAGING',
  'CONTAMINATION',
  'RECALL',
  'STORAGE_ERROR',
  'OTHER',
], 'Motivo de descarte inválido');

// schema de criacao de descarte. exige lote, quantidade positiva e motivo.
export const disposalCreateSchema = z.object({
  batchId: z.number().int().positive('ID do lote deve ser um número positivo'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  reason: disposalReasonSchema,
  notes: z.string().trim().optional(),
}).strict();

// schema de update de descarte. permite ajustar apenas motivo e observacoes.
export const disposalUpdateSchema = z.object({
  reason: disposalReasonSchema.optional(),
  notes: z.string().trim().optional(),
}).strict();

// schema de reversao de descarte. o motivo e obrigatorio pra ficar registrado.
export const disposalReversalSchema = z.object({
  revertReason: z.string().trim().min(1, 'O motivo da reversão é obrigatório'),
}).strict();

// schema de criacao de medicamento no catalogo.
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

// schema de update de medicamento. todos os campos sao opcionais
// pra permitir atualizacoes parciais.
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

// schema de criacao de lote. amarra ao medicamento, exige numero e validade,
// e aceita marcar como bloqueado ja na criacao.
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

// schema de update cadastral do lote. de proposito nao tem campo de
// quantidade, porque saldo so muda pelo endpoint auditado de ajustes.
export const batchUpdateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  expirationDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
  supplier: z.string().min(1).optional(),
}).strict();

// schema de bloqueio sanitario do lote. isBlocked e obrigatorio,
// o motivo e opcional (mas recomendado).
export const batchBlockSchema = z.object({
  isBlocked: z.boolean(),
  blockReason: z.string().optional(),
}).strict();

// schema do ajuste auditado de estoque. sempre exige quantidade nova
// e justificativa, pra deixar rastro de quem mexeu e por que.
export const batchAdjustmentSchema = z.object({
  newQuantity: z.number().int().min(0, 'A nova quantidade não pode ser negativa'),
  reason: z.string().min(1, 'A justificativa do ajuste é obrigatória'),
}).strict();

// schema de criacao de paciente. aqui e o cadastro puro, sem usuario,
// usado pelos endpoints internos da equipe.
export const patientCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  cpf: cpfSchema,
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

// schema de update de paciente. todos os campos opcionais.
export const patientUpdateSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').max(NAME_MAX, 'Nome muito longo').optional(),
  cpf: cpfSchema.optional(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').optional(),
  birthDate: dateStringSchema.optional(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').optional(),
}).strict();

// schema de criacao de agendamento. aceita itens de medicamento opcionais
// (o caso comum e so marcar o slot e depois dispensar).
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

// schema de update geral do agendamento. status e opcional, mas quando
// vier, passa pelo schema de status (que valida a transicao).
export const appointmentUpdateSchema = z.object({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  slotId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  status: appointmentStatusSchema.optional(),
}).strict();

// schema especifico pra atualizar so o status.
export const appointmentUpdateStatusSchema = z.object({
  status: appointmentStatusSchema,
  notes: z.string().optional(),
}).strict();

// schema da dispensacao. aceita a selecao de lotes que serao baixados
// e, opcionalmente, uma observacao.
export const appointmentDispenseSchema = z.object({
  batchSelections: z.array(z.object({
    medicineId: z.number().int().positive('ID do medicamento deve ser positivo'),
    batchId: z.number().int().positive('ID do lote deve ser positivo'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  }).strict()).min(1, 'Selecione ao menos um lote para dispensação').optional(),
  notes: z.string().optional(),
}).strict();

// schema de estorno de dispensacao. exige motivo, pra ficar rastreavel.
export const appointmentRevertDispenseSchema = z.object({
  reason: z.string().trim().min(1, 'O motivo do estorno é obrigatório'),
}).strict();

// schema de criacao de usuario. e o cadastro mais amplo, com role,
// permissoes customizadas e campos de perfil.
export const userCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(NAME_MAX, 'Nome muito longo'),
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  role: roleSchema.optional(),
  // campos opcionais aceitam null tambem, porque o front costuma
  // mandar campos vazios como null em vez de omitir.
  registerDoc: z.string().nullish(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').nullish(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').nullish(),
  birthDate: dateStringSchema.nullish(),
  active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
}).strict();

// schema de update de usuario. campos opcionais, mesma logica de null
// nos campos de perfil.
export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').max(NAME_MAX, 'Nome muito longo').optional(),
  email: z.string().email('Formato de email inválido').optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  role: roleSchema.optional(),
  // campos opcionais aceitam null tambem, porque o front costuma
  // mandar campos vazios como null em vez de omitir.
  registerDoc: z.string().nullish(),
  phone: z.string().max(PHONE_MAX, 'Telefone muito longo').nullish(),
  address: z.string().max(ADDRESS_MAX, 'Endereço muito longo').nullish(),
  birthDate: dateStringSchema.nullish(),
  active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
}).strict();

// schema pra ativar/desativar usuario. e simples: so o booleano active.
export const userToggleActiveSchema = z.object({
  active: z.boolean(),
}).strict();

// schema de criacao de escala (slot de agenda).
export const scheduleSlotCreateSchema = z.object({
  date: z.string().min(1, 'Data da escala é obrigatória'),
  timeSlot: z.string().min(1, 'Horário do slot é obrigatório'),
  maxCapacity: z.number().int().positive('Capacidade deve ser positiva').optional(),
  assignedToId: z.number().int().positive('Farmacêutico responsável é obrigatório'),
}).strict();

// schema de update de escala. aceita assignedToId nulo, pra poder
// desvincular o responsavel sem apagar o slot.
export const scheduleSlotUpdateSchema = z.object({
  date: z.string().optional(),
  timeSlot: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
}).strict();

// middleware generico de validacao de body. recebe um schema zod,
// roda o safeParse e, se falhar, devolve 400 com a primeira mensagem
// e a lista de issues. se passar, substitui req.body pelo dado ja
// tratado (com trim, uppercase, transform, etc).
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