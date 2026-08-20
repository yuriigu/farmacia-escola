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

    const where: Record<string, unknown> = {}
    if (payload.role === 'PACIENTE') {
      const patient = await db.patient.findUnique({ where: { userId: payload.userId as number } })
      if (!patient) {
        return NextResponse.json([])
      }
      where.patientId = patient.id
    }

    const appointments = await db.appointment.findMany({
      where,
      include: {
        patient: true,
        slot: { include: { assignedTo: { select: { id: true, name: true, role: true } } } },
        items: { include: { medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } }, batch: { select: { id: true, batchNumber: true, expirationDate: true } } } },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (error: unknown) {
    console.error('Appointments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // MEDICO can create appointments (bypass requireWrite)
    if (payload.role !== 'MEDICO') {
      const forbidden = await requireWrite(payload, 'appointments')
      if (forbidden) return forbidden
    }

    const body = await request.json()
    const { items, scheduledDate, scheduledTime, slotId, patientId, notes, patientName, patientCpf } = body

    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Validate slot if provided
    if (slotId) {
      const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
      if (!slot) {
        return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 })
      }
      const appointmentCount = await db.appointment.count({ where: { slotId } })
      if (appointmentCount >= slot.maxCapacity) {
        return NextResponse.json({ error: 'Schedule slot is full' }, { status: 400 })
      }
    }

    // Validate medicines exist
    for (const item of items) {
      if (!item.medicineId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'Each item must have a valid medicineId and positive quantity' }, { status: 400 })
      }
      const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } })
      if (!medicine) {
        return NextResponse.json({ error: `Medicine with id ${item.medicineId} not found` }, { status: 404 })
      }
    }

    // Resolve target patient ID
    let targetPatientId = patientId

    if (payload.role === 'PACIENTE') {
      const patient = await db.patient.findUnique({ where: { userId: payload.userId as number } })
      if (!patient) {
        return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
      }
      targetPatientId = patient.id
    } else if (payload.role === 'MEDICO') {
      // Doctor flow: use patientCpf to find or create patient
      if (patientCpf) {
        let patient = await db.patient.findUnique({ where: { cpf: patientCpf } })
        if (!patient && patientName) {
          // Create new patient record
          patient = await db.patient.create({
            data: { name: patientName, cpf: patientCpf },
          })
        } else if (!patient) {
          return NextResponse.json({ error: 'Patient name is required when creating a new patient' }, { status: 400 })
        }
        targetPatientId = patient.id
      } else if (!targetPatientId) {
        return NextResponse.json({ error: 'Patient CPF or Patient ID is required' }, { status: 400 })
      }
    } else {
      // Other roles (ADMIN, FARMACEUTICO, ALUNO)
      if (!targetPatientId) {
        return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 })
      }
    }

    const appointment = await db.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          patientId: targetPatientId!,
          scheduledDate: new Date(scheduledDate),
          ...(scheduledTime ? { scheduledTime } : {}),
          ...(slotId ? { slotId } : {}),
          notes,
        },
        include: {
          patient: true,
          slot: { include: { assignedTo: { select: { id: true, name: true, role: true } } } },
          items: { include: { medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } }, batch: { select: { id: true, batchNumber: true, expirationDate: true } } } },
        },
      })

      for (const item of items) {
        await tx.appointmentItem.create({
          data: {
            appointmentId: created.id,
            medicineId: item.medicineId,
            quantity: item.quantity,
          },
        })
      }

      return created
    })

    logActivity({
      userId: payload.userId as number,
      action: 'create',
      entity: 'appointments',
      entityId: appointment.id,
      details: `Created appointment ${appointment.id} for patient ${appointment.patient?.name}`,
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error: unknown) {
    console.error('Appointments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
