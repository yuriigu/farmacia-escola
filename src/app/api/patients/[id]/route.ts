import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { isPatient, requireWrite } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(_request)
    const { id } = await params

    const patient = await db.patient.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // If PACIENTE, only allow viewing their own patient record
    if (payload && isPatient(payload.role as string)) {
      const ownPatient = await db.patient.findUnique({ where: { userId: payload.userId as number } })
      if (!ownPatient || ownPatient.id !== patient.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(patient)
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

    const forbidden = await requireWrite(payload, 'patients')
    if (forbidden) return forbidden

    const { id } = await params
    const { name, cpf, phone, birthDate, address } = await request.json()

    const patient = await db.patient.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(cpf !== undefined && { cpf }),
        ...(phone !== undefined && { phone }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(address !== undefined && { address }),
      },
    })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'update', entity: 'patients', entityId: patient.id, details: `Updated patient: ${patient.name}` })
    }

    return NextResponse.json(patient)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'CPF already registered' }, { status: 409 })
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

    const forbidden = await requireWrite(payload, 'patients')
    if (forbidden) return forbidden

    const { id } = await params
    const patientId = Number(id)

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: { withdrawals: true, appointments: true },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    if (patient.withdrawals.length > 0 || patient.appointments.length > 0) {
      return NextResponse.json({ error: 'Cannot delete patient with associated records' }, { status: 409 })
    }

    await db.patient.delete({ where: { id: patientId } })

    if (payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'delete', entity: 'patients', entityId: patientId, details: `Deleted patient: ${patient.name}` })
    }

    return NextResponse.json({ message: 'Patient deleted' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
