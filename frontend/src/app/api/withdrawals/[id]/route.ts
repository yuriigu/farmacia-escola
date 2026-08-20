import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(_request)
    if (payload && payload.role === 'PACIENTE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: Number(id) },
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

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const result = withdrawal.items.map((item) => ({
      id: withdrawal.id,
      createdAt: withdrawal.date,
      quantity: item.quantity,
      notes: withdrawal.notes,
      patient: { name: withdrawal.patient.name, cpf: withdrawal.patient.cpf },
      batch: {
        id: item.batch.id,
        code: item.batch.batchNumber,
        medicine: { name: item.batch.medicine.name, dosage: item.batch.medicine.dosage },
      },
      user: { name: withdrawal.user.name },
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requireWrite(payload, 'withdrawals')
    if (forbidden) return forbidden

    const { id } = await params
    const { notes } = await request.json()

    if (notes === undefined) {
      return NextResponse.json({ error: 'Notes field is required' }, { status: 400 })
    }

    const withdrawal = await db.withdrawal.update({
      where: { id: Number(id) },
      data: { notes },
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

    const result = withdrawal.items.map((item) => ({
      id: withdrawal.id,
      createdAt: withdrawal.date,
      quantity: item.quantity,
      notes: withdrawal.notes,
      patient: { name: withdrawal.patient.name, cpf: withdrawal.patient.cpf },
      batch: {
        id: item.batch.id,
        code: item.batch.batchNumber,
        medicine: { name: item.batch.medicine.name, dosage: item.batch.medicine.dosage },
      },
      user: { name: withdrawal.user.name },
    }))

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'withdrawals', entityId: withdrawal.id, details: `Updated withdrawal ${withdrawal.id}` })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requireWrite(payload, 'withdrawals')
    if (forbidden) return forbidden

    const { id } = await params
    const withdrawalId = Number(id)

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { items: true },
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      for (const item of withdrawal.items) {
        await tx.stockBatch.update({
          where: { id: item.batchId },
          data: { currentQuantity: { increment: item.quantity } },
        })
      }
      await tx.withdrawalItem.deleteMany({ where: { withdrawalId } })
      await tx.withdrawal.delete({ where: { id: withdrawalId } })
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'withdrawals', entityId: withdrawalId, details: `Deleted withdrawal ${withdrawalId}` })
    }

    return NextResponse.json({ message: 'Withdrawal deleted and stock restored' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
