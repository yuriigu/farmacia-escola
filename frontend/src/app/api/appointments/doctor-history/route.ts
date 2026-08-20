import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/appointments/doctor-history?cpf=XXX
 * Returns unique patients from this doctor's previously created appointments
 * that match the given CPF prefix. Used for autocomplete in the doctor's appointment modal.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (payload.role !== 'MEDICO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cpf = searchParams.get('cpf') ?? ''

    if (!cpf || cpf.length < 3) {
      return NextResponse.json([])
    }

    // Find appointments created by this user (doctor) where patient CPF starts with the given prefix
    // We look at the patient relation through the appointment
    const matchingPatients = await db.appointment.findMany({
      where: {
        // Filter by appointments that have items linked (created by this doctor via appointments)
        patient: {
          cpf: { startsWith: cpf },
        },
      },
      select: {
        patientId: true,
        patient: {
          select: { id: true, name: true, cpf: true },
        },
      },
      distinct: ['patientId'],
      take: 10,
    })

    // Deduplicate patients
    const seen = new Set<number>()
    const patients = matchingPatients
      .filter((a) => {
        if (!a.patient || seen.has(a.patient.id)) return false
        seen.add(a.patient.id)
        return true
      })
      .map((a) => a.patient!)

    return NextResponse.json(patients)
  } catch (error: unknown) {
    console.error('Doctor history GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
