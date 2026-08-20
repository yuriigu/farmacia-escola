import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const medicine = await db.medicine.findUnique({
      where: { id: Number(id) },
      include: {
        batches: {
          select: { currentQuantity: true },
        },
      },
    })

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: medicine.id,
      name: medicine.name,
      activeIngredient: medicine.activeIngredient,
      dosage: medicine.dosage,
      accessibleDesc: medicine.accessibleDesc,
      category: medicine.category,
      totalQuantity: medicine.batches.reduce((sum, b) => sum + b.currentQuantity, 0),
      batchesCount: medicine.batches.length,
      createdAt: medicine.createdAt,
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

    const forbidden = await requireWrite(payload, 'medicines')
    if (forbidden) return forbidden

    const { id } = await params
    const { name, activeIngredient, dosage, accessibleDesc, category } = await request.json()

    const medicine = await db.medicine.update({
      where: { id: Number(id) },
      data: { name, activeIngredient, dosage, accessibleDesc, category },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'medicines', entityId: medicine.id, details: `Updated medicine: ${medicine.name}` })
    }

    return NextResponse.json(medicine)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
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

    const forbidden = await requireWrite(payload, 'medicines')
    if (forbidden) return forbidden

    const { id } = await params
    const medId = Number(id)

    const activeBatches = await db.stockBatch.count({
      where: { medicineId: medId, currentQuantity: { gt: 0 } },
    })
    if (activeBatches > 0) {
      return NextResponse.json({ error: 'Cannot delete medicine with active batches' }, { status: 409 })
    }

    const activeAppointments = await db.appointment.count({
      where: { medicineId: medId, status: { in: ['PENDING', 'CONFIRMED'] } },
    })
    if (activeAppointments > 0) {
      return NextResponse.json({ error: 'Cannot delete medicine with active appointments' }, { status: 409 })
    }

    await db.medicine.delete({ where: { id: medId } })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'medicines', entityId: medId, details: `Deleted medicine ${medId}` })
    }

    return NextResponse.json({ message: 'Medicine deleted' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
