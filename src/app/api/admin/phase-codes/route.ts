import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const codes = await prisma.laborCode.findMany({
    where: {},
    orderBy: [{ code: 'asc' }],
    select: { id: true, code: true, name: true, description: true, hourlyRate: true, isActive: true },
    take: 5000,
  })
  return NextResponse.json({ success: true, data: codes })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const data = createSchema.parse(body)

  const created = await prisma.laborCode.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      category: 'PHASE',
      hourlyRate: data.hourlyRate ?? 0,
      isActive: data.isActive ?? true,
    },
    select: { id: true, code: true, name: true, description: true, hourlyRate: true, isActive: true },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}

