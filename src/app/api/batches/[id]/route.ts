import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const batch = await db.stockBatch.findUnique({
      where: { id: Number(id) },
      include: { medicine: true },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
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

    const forbidden = await requireWrite(payload, 'batches')
    if (forbidden) return forbidden

    const { id } = await params
    const { batchNumber, currentQuantity, expirationDate } = await request.json()

    const batch = await db.stockBatch.update({
      where: { id: Number(id) },
      data: {
        ...(batchNumber !== undefined && { batchNumber }),
        ...(currentQuantity !== undefined && { currentQuantity: Number(currentQuantity) }),
        ...(expirationDate !== undefined && { expirationDate: new Date(expirationDate) }),
      },
      include: { medicine: true },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'batches', entityId: batch.id, details: `Updated batch: ${batch.batchNumber}` })
    }

    return NextResponse.json(batch)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Batch number already exists' }, { status: 409 })
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

    const forbidden = await requireWrite(payload, 'batches')
    if (forbidden) return forbidden

    const { id } = await params
    const batchId = Number(id)

    const batch = await db.stockBatch.findUnique({
      where: { id: batchId },
      include: { withdrawalItems: true, disposals: true },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    if (batch.withdrawalItems.length > 0 || batch.disposals.length > 0) {
      return NextResponse.json({ error: 'Cannot delete batch with associated movements' }, { status: 409 })
    }

    await db.stockBatch.delete({ where: { id: batchId } })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'batches', entityId: batchId, details: `Deleted batch ${batchId}` })
    }

    return NextResponse.json({ message: 'Batch deleted' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
