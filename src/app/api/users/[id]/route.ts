import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const user = await db.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
        patient: { select: { id: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)
    const isAdmin = payload.role === 'ADMIN'
    const isSelf = payload.userId === userId

    // Only ADMIN or self-update allowed
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, password, role, registerDoc, phone, active, permissions } = await request.json()

    const data: Record<string, unknown> = {}

    // Admin can update everything
    if (isAdmin) {
      if (name !== undefined) data.name = name
      if (email !== undefined) data.email = email
      if (role !== undefined) data.role = role
      if (registerDoc !== undefined) data.registerDoc = registerDoc || null
      if (phone !== undefined) data.phone = phone
      if (active !== undefined) data.active = active
      if (password) data.password = await hashPassword(password)
      if (permissions !== undefined) data.permissions = permissions
    }

    // Self-update: only email and phone
    if (isSelf && !isAdmin) {
      if (email !== undefined) data.email = email
      if (phone !== undefined) data.phone = phone
    }

    // If admin updating self, allow all admin fields
    if (isAdmin && isSelf) {
      if (name !== undefined) data.name = name
      if (email !== undefined) data.email = email
      if (role !== undefined) data.role = role
      if (registerDoc !== undefined) data.registerDoc = registerDoc || null
      if (phone !== undefined) data.phone = phone
      if (active !== undefined) data.active = active
      if (password) data.password = await hashPassword(password)
      if (permissions !== undefined) data.permissions = permissions
    }

    const user = await db.user.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
        patient: { select: { id: true } },
      },
    })

    return NextResponse.json(user)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getAuthUser(request)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)

    if (payload.userId === userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { withdrawals: true, disposals: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.withdrawals.length > 0 || user.disposals.length > 0) {
      return NextResponse.json({ error: 'Cannot delete user with associated records' }, { status: 409 })
    }

    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ message: 'User deleted' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
