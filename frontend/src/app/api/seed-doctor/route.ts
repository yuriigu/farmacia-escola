import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * One-time seed endpoint to create a doctor user for testing.
 * POST /api/seed-doctor with { email, password, name }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 })
    }

    // Check if already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'MEDICO',
        phone: null,
        active: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ message: 'Doctor user created successfully', user: userWithoutPassword }, { status: 201 })
  } catch (error: unknown) {
    console.error('Seed doctor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
