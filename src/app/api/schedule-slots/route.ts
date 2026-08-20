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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = { active: true }

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    } else if (startDate) {
      where.date = { gte: new Date(startDate) }
    }

    const slots = await db.scheduleSlot.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        appointments: { where: { status: 'PENDING' } },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    })

    const result = slots.map(slot => ({
      ...slot,
      _count: { appointments: slot.appointments.length },
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

    const forbidden = await requireWrite(payload, 'scheduleSlots')
    if (forbidden) return forbidden

    const { date, timeSlot, maxCapacity, assignedToId } = await request.json()

    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'Date and time slot are required' }, { status: 400 })
    }

    const slot = await db.scheduleSlot.create({
      data: {
        date: new Date(date),
        timeSlot,
        maxCapacity: maxCapacity || 5,
        assignedToId: assignedToId || null,
      },
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    })

    logActivity({ userId: payload.userId as number, action: 'create', entity: 'scheduleSlots', entityId: slot.id, details: `Created schedule slot ${slot.timeSlot} on ${new Date(slot.date).toLocaleDateString('pt-BR')}` })

    return NextResponse.json(slot, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Já existe um horário nesse dia e horário' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
