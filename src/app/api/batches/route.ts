import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const medicineId = searchParams.get('medicineId')

    const where = medicineId ? { medicineId: Number(medicineId) } : {}

    const batches = await db.stockBatch.findMany({
      where,
      include: { medicine: true },
      orderBy: { expirationDate: 'asc' },
    })

    return NextResponse.json(batches)
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

    const forbidden = await requireWrite(payload, 'batches')
    if (forbidden) return forbidden

    const { medicineId, batchNumber, currentQuantity, expirationDate } = await request.json()

    if (!medicineId || !batchNumber || currentQuantity === undefined || !expirationDate) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const medicine = await db.medicine.findUnique({ where: { id: medicineId } })
    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const batch = await db.stockBatch.create({
      data: {
        medicineId,
        batchNumber,
        currentQuantity: Number(currentQuantity),
        expirationDate: new Date(expirationDate),
      },
      include: { medicine: true },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'create', entity: 'batches', entityId: batch.id, details: `Created batch: ${batch.batchNumber}` })
    }

    return NextResponse.json(batch, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Batch number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
