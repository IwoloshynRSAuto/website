import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authorize } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'

// Compatibility endpoint: older UI calls /api/employees.
// Source of truth is the User model (same as /api/users).
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'read', 'user')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const employees = await prisma.user.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        position: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { email: 'asc' }],
    })

    return NextResponse.json({ success: true, data: employees })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch employees' }, { status: 500 })
  }
}

