import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requireWrite(payload, 'scheduleSlots')
    if (forbidden) return forbidden

    const { id } = await params
    const { maxCapacity, active, assignedToId } = await request.json()

    const data: Record<string, unknown> = {}
    if (maxCapacity !== undefined) data.maxCapacity = maxCapacity
    if (active !== undefined) data.active = active
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null

    const slot = await db.scheduleSlot.update({
      where: { id: Number(id) },
      data,
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    })

    return NextResponse.json(slot)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 })
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

    const forbidden = await requireWrite(payload, 'scheduleSlots')
    if (forbidden) return forbidden

    const { id } = await params
    const slotId = Number(id)

    // Check for linked appointments
    const appointmentCount = await db.appointment.count({ where: { slotId } })
    if (appointmentCount > 0) {
      return NextResponse.json({ error: 'Cannot delete slot with existing appointments' }, { status: 409 })
    }

    await db.scheduleSlot.delete({ where: { id: slotId } })

    logActivity({ userId: payload.userId as number, action: 'delete', entity: 'scheduleSlots', entityId: slotId, details: `Deleted schedule slot ${slotId}` })

    return NextResponse.json({ message: 'Schedule slot deleted' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
