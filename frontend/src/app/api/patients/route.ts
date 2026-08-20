import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { isPatient } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    // If PACIENTE, only return their own patient record
    if (payload && isPatient(payload.role as string)) {
      const patient = await db.patient.findUnique({
        where: { userId: payload.userId as number },
        include: {
          _count: {
            select: { withdrawals: true, appointments: true },
          },
        },
      })
      return NextResponse.json(patient ? [patient] : [])
    }

    const patients = await db.patient.findMany({
      where: {
        OR: [
          { name: { contains: search } },
          { cpf: { contains: search } },
        ],
      },
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(patients)
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
    if (payload.role !== 'ADMIN' && payload.role !== 'FARMACEUTICO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, cpf, phone, birthDate, address } = await request.json()

    if (!name || !cpf) {
      return NextResponse.json({ error: 'Name and CPF are required' }, { status: 400 })
    }

    const patient = await db.patient.create({
      data: {
        name,
        cpf,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        address,
      },
    })

    if (payload && payload.role === 'FARMACEUTICO') {
      logActivity({ userId: payload.userId as number, action: 'create', entity: 'patients', entityId: patient.id, details: `Created patient: ${patient.name}` })
    }

    return NextResponse.json(patient, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'CPF already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}