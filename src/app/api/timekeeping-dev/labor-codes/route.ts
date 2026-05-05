import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAllowedPhaseCodeSetForUser } from '@/lib/timekeeping/phase-code-access'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const allowed = await getAllowedPhaseCodeSetForUser(session.user.id)
    const codes = await prisma.laborCode.findMany({
      where: { isActive: true },
      orderBy: [{ code: 'asc' }],
      select: { id: true, code: true, name: true },
      take: 2000,
    })

    const filtered = codes.filter((c) => allowed.has(c.code) && c.code)

    return NextResponse.json({ success: true, data: filtered })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch labor codes' }, { status: 500 })
  }
}

