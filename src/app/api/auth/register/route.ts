import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, cpf, phone, birthDate, address } = await request.json()

    if (!name || !email || !password || !cpf) {
      return NextResponse.json({ error: 'Name, email, password and CPF are required' }, { status: 400 })
    }

    const digitsOnly = (v: string) => v.replace(/\D/g, '')
    const cpfDigits = digitsOnly(cpf)
    if (cpfDigits.length !== 11 || /^(.)\1{10}$/.test(cpfDigits)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }
    if (phone) {
      const phoneDigits = digitsOnly(phone)
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
      }
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const existingPatient = await db.patient.findUnique({ where: { cpf } })
    if (existingPatient) {
      return NextResponse.json({ error: 'CPF already registered' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'PACIENTE',
          phone,
        },
        include: { patient: true },
      })

      const patient = await tx.patient.create({
        data: {
          name,
          cpf,
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          address,
          userId: newUser.id,
        },
      })

      return { ...newUser, patient }
    })

    const token = signToken({ userId: user.id, role: user.role })
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        token,
        user: {
          ...userWithoutPassword,
          patientId: user.patient?.id ?? null,
        },
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Email or CPF already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
