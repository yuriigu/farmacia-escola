import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getUserPermissions } from '@/lib/role-guard'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId as number },
      include: { patient: true },
    })

    if (!user || !user.active) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const permissions = await getUserPermissions(user.id)

    const { password: _, permissions: _p, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      patientId: user.patient?.id ?? null,
      permissions,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
