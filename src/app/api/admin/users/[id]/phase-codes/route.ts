import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { getPhaseCodeAccessSnapshotForUser } from '@/lib/timekeeping/phase-code-access'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  overrides: z.array(
    z.object({
      laborCodeId: z.string().min(1),
      mode: z.enum(['ALLOW', 'DENY']),
    })
  ),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)
  const snap = await getPhaseCodeAccessSnapshotForUser(id)
  return NextResponse.json({ success: true, data: snap })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)
  const body = await request.json()
  const data = putSchema.parse(body)

  const codes = await prisma.laborCode.findMany({
    where: { id: { in: data.overrides.map((o) => o.laborCodeId) } },
    select: { id: true },
  })
  const valid = new Set(codes.map((c) => c.id))
  const sanitized = data.overrides.filter((o) => valid.has(o.laborCodeId))

  await prisma.$transaction(async (tx) => {
    await tx.userPhaseCodeOverride.deleteMany({ where: { userId: id } })
    if (sanitized.length) {
      await tx.userPhaseCodeOverride.createMany({
        data: sanitized.map((o) => ({ userId: id, laborCodeId: o.laborCodeId, mode: o.mode })),
        skipDuplicates: true,
      })
    }
  })

  const snap = await getPhaseCodeAccessSnapshotForUser(id)
  return NextResponse.json({ success: true, data: snap })
}

