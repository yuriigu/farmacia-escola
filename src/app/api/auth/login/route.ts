import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, signToken } from '@/lib/auth'
import { getUserPermissions } from '@/lib/role-guard'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { patient: true },
    })

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ userId: user.id, role: user.role })

    const permissions = await getUserPermissions(user.id)

    const { password: _, permissions: _p, ...userWithoutPassword } = user

    return NextResponse.json({
      token,
      user: {
        ...userWithoutPassword,
        patientId: user.patient?.id ?? null,
        permissions,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
