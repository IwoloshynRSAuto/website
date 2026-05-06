import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth/authorization'
import { recomputeTimeEntryCostSnapshot } from '@/lib/timekeeping/recompute-time-entry-cost-snapshot'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const resolved = await Promise.resolve(params)
  const jobId = resolved.id

  try {
    const updatedCount = await prisma.$transaction(async (tx) => {
      const entries = await tx.timeEntry.findMany({
        where: { jobId },
        select: { id: true, regularHours: true, overtimeHours: true, laborCodeId: true, rate: true },
      })
      for (const e of entries) {
        await recomputeTimeEntryCostSnapshot(tx, {
          timeEntryId: e.id,
          regularHours: e.regularHours,
          overtimeHours: e.overtimeHours,
          laborCodeId: e.laborCodeId,
          explicitRate: e.rate != null ? Number(e.rate) : null,
        })
      }
      return entries.length
    })

    return NextResponse.json({ success: true, data: { updatedCount } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to recompute costs'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

