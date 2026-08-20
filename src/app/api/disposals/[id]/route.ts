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
    const disposal = await db.disposal.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { name: true, dosage: true } },
          },
        },
      },
    })

    if (!disposal) {
      return NextResponse.json({ error: 'Disposal not found' }, { status: 404 })
    }

    return NextResponse.json({
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
    })
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

    const forbidden = await requireWrite(payload, 'disposals')
    if (forbidden) return forbidden

    const { id } = await params
    const { reason } = await request.json()

    if (reason === undefined) {
      return NextResponse.json({ error: 'Reason field is required' }, { status: 400 })
    }

    const disposal = await db.disposal.update({
      where: { id: Number(id) },
      data: { reason },
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { name: true, dosage: true } },
          },
        },
      },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'disposals', entityId: disposal.id, details: `Updated disposal ${disposal.id}` })
    }

    return NextResponse.json({
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
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Disposal not found' }, { status: 404 })
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

    const forbidden = await requireWrite(payload, 'disposals')
    if (forbidden) return forbidden

    const { id } = await params
    const disposalId = Number(id)

    const disposal = await db.disposal.findUnique({ where: { id: disposalId } })
    if (!disposal) {
      return NextResponse.json({ error: 'Disposal not found' }, { status: 404 })
    }

    if (!disposal.reverted) {
      return NextResponse.json({ error: 'Cannot delete a non-reverted disposal. Revert it first.' }, { status: 409 })
    }

    await db.disposal.delete({ where: { id: disposalId } })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'disposals', entityId: disposalId, details: `Deleted disposal ${disposalId}` })
    }

    return NextResponse.json({ message: 'Disposal deleted' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
