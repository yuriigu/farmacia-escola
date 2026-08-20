import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (payload && payload.role === 'PACIENTE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const disposals = await db.disposal.findMany({
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { name: true, dosage: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const result = disposals.map((d) => ({
      id: d.id,
      createdAt: d.date,
      quantity: d.quantity,
      reason: d.reason,
      reverted: d.reverted,
      batch: {
        id: d.batch.id,
        code: d.batch.batchNumber,
        expiresAt: d.batch.expirationDate,
        medicine: { name: d.batch.medicine.name, dosage: d.batch.medicine.dosage },
      },
      user: { name: d.user.name },
    }))

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

    const forbidden = await requireWrite(payload, 'disposals')
    if (forbidden) return forbidden

    const { batchId, quantity, reason } = await request.json()

    if (!batchId || !quantity) {
      return NextResponse.json({ error: 'Batch ID and quantity are required' }, { status: 400 })
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

    const disposal = await db.$transaction(async (tx) => {
      const newDisposal = await tx.disposal.create({
        data: {
          batchId,
          userId: payload.userId as number,
          quantity,
          reason,
        },
        include: {
          user: { select: { name: true } },
          batch: {
            include: {
              medicine: { select: { name: true, dosage: true } },
            },
          },
        },
      })

      await tx.stockBatch.update({
        where: { id: batchId },
        data: { currentQuantity: { decrement: quantity } },
      })

      return newDisposal
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'create', entity: 'disposals', entityId: disposal.id, details: `Created disposal for batch ${disposal.batchId}` })
    }

    return NextResponse.json(
      {
        id: disposal.id,
        createdAt: disposal.date,
        quantity: disposal.quantity,
        reason: disposal.reason,
        reverted: disposal.reverted,
        batch: {
          id: disposal.batch.id,
          code: disposal.batch.batchNumber,
          expiresAt: disposal.batch.expirationDate,
          medicine: { name: disposal.batch.medicine.name, dosage: disposal.batch.medicine.dosage },
        },
        user: { name: disposal.user.name },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
