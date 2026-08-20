import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where = payload.role === 'PACIENTE'
      ? { patientId: payload.patientId as number }
      : {}

    const withdrawals = await db.withdrawal.findMany({
      where,
      include: {
        user: { select: { name: true } },
        patient: { select: { name: true, cpf: true } },
        items: {
          include: {
            batch: {
              include: {
                medicine: { select: { name: true, dosage: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const result = withdrawals.flatMap((w) =>
      w.items.map((item) => ({
        id: w.id,
        createdAt: w.date,
        quantity: item.quantity,
        notes: w.notes,
        patient: { name: w.patient.name, cpf: w.patient.cpf },
        batch: {
          id: item.batch.id,
          medicineId: item.batch.medicineId,
          code: item.batch.batchNumber,
          medicine: { name: item.batch.medicine.name, dosage: item.batch.medicine.dosage },
        },
        user: { name: w.user.name },
      })),
    )

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requireWrite(payload, 'withdrawals')
    if (forbidden) return forbidden

    const { patientName, patientCpf, batchId, quantity, notes, appointmentId } = await request.json()

    if (!patientName || !patientCpf || !batchId || !quantity) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 })
    }

    const batch = await db.stockBatch.findUnique({ where: { id: batchId } })
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    if (batch.currentQuantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }

    const withdrawal = await db.$transaction(async (tx) => {
      let patient = await tx.patient.findUnique({ where: { cpf: patientCpf } })
      if (!patient) {
        patient = await tx.patient.create({
          data: { name: patientName, cpf: patientCpf },
        })
      }

      const newWithdrawal = await tx.withdrawal.create({
        data: {
          patientId: patient.id,
          userId: payload.userId as number,
          notes,
          ...(appointmentId ? { appointmentId } : {}),
        },
        include: {
          user: { select: { name: true } },
          patient: { select: { name: true, cpf: true } },
          items: {
            include: {
              batch: {
                include: { medicine: { select: { name: true, dosage: true } } },
              },
            },
          },
        },
      })

      await tx.withdrawalItem.create({
        data: {
          withdrawalId: newWithdrawal.id,
          batchId,
          quantity,
        },
      })

      await tx.stockBatch.update({
        where: { id: batchId },
        data: { currentQuantity: { decrement: quantity } },
      })

      return newWithdrawal
    })

    const batchWithMedicine = await db.stockBatch.findUnique({
      where: { id: batchId },
      include: { medicine: { select: { name: true, dosage: true } } },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'create', entity: 'withdrawals', entityId: withdrawal.id, details: `Created withdrawal for patient: ${withdrawal.patient.name}` })
    }

    return NextResponse.json(
      {
        id: withdrawal.id,
        createdAt: withdrawal.date,
        quantity,
        notes: withdrawal.notes,
        patient: { name: withdrawal.patient.name, cpf: withdrawal.patient.cpf },
        batch: {
          id: batchId,
          medicineId: batch.medicineId,
          code: batchWithMedicine?.batchNumber ?? '',
          medicine: {
            name: batchWithMedicine?.medicine.name ?? '',
            dosage: batchWithMedicine?.medicine.dosage ?? '',
          },
        },
        user: { name: withdrawal.user.name },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
