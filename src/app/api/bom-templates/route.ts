import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.bOM.findMany({
    where: { status: 'ARCHIVED', tags: { contains: 'TEMPLATE' } },
    orderBy: { updatedAt: 'desc' },
    include: { parts: { select: { id: true } } },
    take: 500,
  })

  return NextResponse.json({
    success: true,
    data: templates.map((t) => ({
      id: t.id,
      name: t.name,
      partsCount: t.parts.length,
      updatedAt: t.updatedAt,
    })),
  })
}

