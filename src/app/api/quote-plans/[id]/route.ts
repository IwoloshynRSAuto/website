import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = params instanceof Promise ? await params : params
  const id = resolved.id

  const plan = await prisma.quotePlan.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      items: {
        orderBy: [{ sortOrder: 'asc' }, { taskCode: 'asc' }],
        select: { id: true, taskCode: true, description: true, sortOrder: true, laborCodeId: true },
        take: 2000,
      },
    },
  })

  if (!plan) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: plan })
}

