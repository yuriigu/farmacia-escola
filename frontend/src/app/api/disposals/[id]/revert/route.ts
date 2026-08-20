import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requireWrite(payload, 'disposals')
    if (forbidden) return forbidden

    const { id } = await params
    const disposalId = Number(id)

    const disposal = await db.disposal.findUnique({ where: { id: disposalId } })
    if (!disposal) {
      return NextResponse.json({ error: 'Disposal not found' }, { status: 404 })
    }

    if (disposal.reverted) {
      return NextResponse.json({ error: 'Disposal already reverted' }, { status: 409 })
    }

    const result = await db.$transaction(async (tx) => {
      await tx.stockBatch.update({
        where: { id: disposal.batchId },
        data: { currentQuantity: { increment: disposal.quantity } },
      })

      return tx.disposal.update({
        where: { id: disposalId },
        data: { reverted: true },
        include: {
          user: { select: { name: true } },
          batch: {
            include: {
              medicine: { select: { name: true, dosage: true } },
            },
          },
        },
      })
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'revert', entity: 'disposals', entityId: disposalId, details: `Reverted disposal ${disposalId}` })
    }

    return NextResponse.json({
      id: result.id,
      createdAt: result.date,
      quantity: result.quantity,
      reason: result.reason,
      reverted: result.reverted,
      batch: {
        id: result.batch.id,
        code: result.batch.batchNumber,
        expiresAt: result.batch.expirationDate,
        medicine: { name: result.batch.medicine.name, dosage: result.batch.medicine.dosage },
      },
      user: { name: result.user.name },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
