import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET() {
  try {
    const medicines = await db.medicine.findMany({
      include: {
        batches: {
          select: { currentQuantity: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = medicines.map((m) => ({
      id: m.id,
      name: m.name,
      activeIngredient: m.activeIngredient,
      dosage: m.dosage,
      accessibleDesc: m.accessibleDesc,
      category: m.category,
      totalQuantity: m.batches.reduce((sum, b) => sum + b.currentQuantity, 0),
      batchesCount: m.batches.length,
      createdAt: m.createdAt,
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

    const forbidden = await requireWrite(payload, 'medicines')
    if (forbidden) return forbidden

    const { name, activeIngredient, dosage, accessibleDesc, category } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const medicine = await db.medicine.create({
      data: { name, activeIngredient, dosage, accessibleDesc, category },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'create', entity: 'medicines', entityId: medicine.id, details: `Created medicine: ${medicine.name}` })
    }

    return NextResponse.json(medicine, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
