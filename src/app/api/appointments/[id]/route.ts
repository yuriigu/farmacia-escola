import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const appointment = await db.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        patient: true,
        slot: { include: { assignedTo: { select: { id: true, name: true, role: true } } } },
        items: { include: { medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } }, batch: { select: { id: true, batchNumber: true, expirationDate: true } } } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    return NextResponse.json(appointment)
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

    const { id } = await params
    const body = await request.json()
    const { scheduledDate, status, notes } = body

    // Permission check: PACIENTE can only cancel their own appointments
    if (payload.role === 'PACIENTE') {
      if (status !== 'CANCELLED') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const patient = await db.patient.findUnique({ where: { userId: payload.userId as number } })
      if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const existing = await db.appointment.findUnique({ where: { id: Number(id) } })
      if (!existing || existing.patientId !== patient.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      const forbidden = await requireWrite(payload, 'appointments')
      if (forbidden) return forbidden
    }

    const appointment = await db.appointment.update({
      where: { id: Number(id) },
      data: {
        ...(scheduledDate !== undefined && { scheduledDate: new Date(scheduledDate) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        patient: true,
        slot: { include: { assignedTo: { select: { id: true, name: true, role: true } } } },
        items: { include: { medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } }, batch: { select: { id: true, batchNumber: true, expirationDate: true } } } },
      },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'appointments', entityId: appointment.id, details: `Updated appointment ${appointment.id}` })
    }

    return NextResponse.json(appointment)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
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

    const forbidden = await requireWrite(payload, 'appointments')
    if (forbidden) return forbidden

    const { id } = await params
    const appointmentId = Number(id)
    await db.appointmentItem.deleteMany({ where: { appointmentId } })
    await db.appointment.delete({ where: { id: appointmentId } })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'appointments', entityId: appointmentId, details: `Deleted appointment ${appointmentId}` })
    }

    return NextResponse.json({ message: 'Appointment deleted' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
