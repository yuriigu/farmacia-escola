import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';

const patientRoutes = Router();

// Todas as rotas de paciente exigem autenticação
patientRoutes.use(authMiddleware);

// GET /patients - Listar pacientes (com busca por nome/cpf)
patientRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const whereCondition: Record<string, unknown> = {};
    if (search) {
      const term = String(search);
      whereCondition.OR = [
        { name: { contains: term } },
        { cpf: { contains: term } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where: whereCondition,
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(patients);
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    return res.status(500).json({ error: 'Erro interno ao listar pacientes.' });
  }
});

// GET /patients/:id - Detalhar paciente + histórico de retiradas
patientRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: Number(id) },
      include: {
        withdrawals: {
          include: {
            user: { select: { id: true, name: true } },
            items: {
              include: {
                batch: { include: { medicine: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        appointments: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    return res.json(patient);
  } catch (error) {
    console.error('Erro ao detalhar paciente:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar paciente.' });
  }
});

// POST /patients - Criar paciente (admin/farmacêutico)
patientRoutes.post('/', roleMiddleware(['ADMIN', 'FARMACEUTICO']), async (req: Request, res: Response) => {
  try {
    const { name, cpf, phone, birthDate, address, userId } = req.body;

    if (!name || !cpf) {
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
    }

    const existingPatient = await prisma.patient.findUnique({ where: { cpf } });
    if (existingPatient) {
      return res.status(409).json({ error: 'Já existe um paciente com este CPF.' });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        cpf,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        userId: userId ? Number(userId) : undefined,
      },
    });

    return res.status(201).json(patient);
  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    return res.status(500).json({ error: 'Erro interno ao criar paciente.' });
  }
});

// PUT /patients/:id - Atualizar dados do paciente
patientRoutes.put('/:id', roleMiddleware(['ADMIN', 'FARMACEUTICO']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cpf, phone, birthDate, address } = req.body;

    const existingPatient = await prisma.patient.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPatient) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    if (cpf && cpf !== existingPatient.cpf) {
      const cpfConflict = await prisma.patient.findUnique({ where: { cpf } });
      if (cpfConflict) {
        return res.status(409).json({ error: 'Já existe um paciente com este CPF.' });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (cpf !== undefined) data.cpf = cpf;
    if (phone !== undefined) data.phone = phone;
    if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;
    if (address !== undefined) data.address = address;

    const updatedPatient = await prisma.patient.update({
      where: { id: Number(id) },
      data,
    });

    return res.json(updatedPatient);
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar paciente.' });
  }
});

// DELETE /patients/:id - Remover apenas se não tiver retiradas (nem agendamentos)
patientRoutes.delete('/:id', roleMiddleware(['ADMIN', 'FARMACEUTICO']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingPatient = await prisma.patient.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPatient) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    const withdrawalsCount = await prisma.withdrawal.count({
      where: { patientId: Number(id) },
    });
    const appointmentsCount = await prisma.appointment.count({
      where: { patientId: Number(id) },
    });

    if (withdrawalsCount > 0 || appointmentsCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir: o paciente possui retiradas ou agendamentos vinculados.',
      });
    }

    await prisma.patient.delete({ where: { id: Number(id) } });

    return res.json({ message: 'Paciente excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir paciente:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir paciente.' });
  }
});

export { patientRoutes };
