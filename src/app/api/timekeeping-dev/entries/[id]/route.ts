import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getAllowedPhaseCodeSetForUser } from '@/lib/timekeeping/phase-code-access'

function toIso(d: Date): string {
  return d.toISOString()
}

function roundToNearest15Minutes(date: Date): Date {
  const d = new Date(date)
  const minutes = d.getMinutes()
  const roundedMinutes = Math.round(minutes / 15) * 15
  d.setSeconds(0, 0)
  if (roundedMinutes === 60) {
    d.setMinutes(0)
    d.setHours(d.getHours() + 1)
  } else {
    d.setMinutes(roundedMinutes)
  }
  return d
}

function addHours(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 3_600_000)
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
}

async function assertNoOverlap(opts: {
  userId: string
  dateAnchor: Date
  startTime: Date
  hoursWorked: number
  excludeId: string
}) {
  const dayStart = new Date(opts.dateAnchor)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(opts.dateAnchor)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const existing = await prisma.devTimeEntry.findMany({
    where: {
      userId: opts.userId,
      date: { gte: dayStart, lte: dayEnd },
      id: { not: opts.excludeId },
    },
    select: { startTime: true, hoursWorked: true, endTime: true },
  })

  const nextStart = opts.startTime
  const nextEnd = addHours(nextStart, opts.hoursWorked)

  for (const e of existing) {
    const eStart = e.startTime
    const eHours = Number(e.hoursWorked?.toString?.() ? e.hoursWorked.toString() : e.hoursWorked)
    const eEnd = e.endTime ?? (Number.isFinite(eHours) ? addHours(eStart, eHours) : eStart)
    if (rangesOverlap(nextStart, nextEnd, eStart, eEnd)) {
      throw new Error('Time entries cannot overlap')
    }
  }
}

const patchSchema = z.object({
  date: z.string().optional(),
  jobId: z.string().optional(),
  startTime: z.string().optional(),
  hoursWorked: z.union([z.string(), z.number()]).optional(),
  phaseCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function parseDateOnlyToUtcNoon(value: string): Date {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
  }
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const da = Number(m[3])
  return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0))
}

function serializeEntry(e: {
  id: string
  userId: string
  jobId: string | null
  job: { id: string; jobNumber: string; title: string } | null
  date: Date
  startTime: Date
  hoursWorked: Prisma.Decimal
  phaseCode: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: e.id,
    userId: e.userId,
    jobId: e.jobId,
    job: e.job,
    date: toIso(e.date),
    startTime: toIso(e.startTime),
    endTime: null,
    hoursWorked: e.hoursWorked.toString(),
    phaseCode: e.phaseCode,
    notes: e.notes,
    createdAt: toIso(e.createdAt),
    updatedAt: toIso(e.updatedAt),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const entry = await prisma.devTimeEntry.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        userId: true,
        jobId: true,
        job: { select: { id: true, jobNumber: true, title: true } },
        date: true,
        startTime: true,
        hoursWorked: true,
        phaseCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!entry) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: serializeEntry(entry) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const existing = await prisma.devTimeEntry.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, date: true, startTime: true, hoursWorked: true },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const data = patchSchema.parse(body)

    const update: any = {}
    if (data.date) update.date = parseDateOnlyToUtcNoon(data.date)
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, status: { not: 'COMPLETED' } },
        select: { id: true },
      })
      if (!job) {
        return NextResponse.json({ success: false, error: 'Invalid job' }, { status: 400 })
      }
      update.jobId = data.jobId
    }
    if (data.startTime) {
      const start = new Date(data.startTime)
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid startTime' }, { status: 400 })
      }
      update.startTime = roundToNearest15Minutes(start)
    }
    if (data.hoursWorked !== undefined) {
      const hours =
        typeof data.hoursWorked === 'number' ? data.hoursWorked : Number(String(data.hoursWorked).trim())
      if (!Number.isFinite(hours) || hours <= 0) {
        return NextResponse.json({ success: false, error: 'hoursWorked must be > 0' }, { status: 400 })
      }
      update.hoursWorked = new Prisma.Decimal(hours)
    }
    if (data.phaseCode !== undefined) {
      const phaseCode = data.phaseCode?.trim() ? data.phaseCode.trim() : null
      if (phaseCode) {
        const allowed = await getAllowedPhaseCodeSetForUser(session.user.id)
        if (!allowed.has(phaseCode)) {
          return NextResponse.json({ success: false, error: 'Forbidden phase code' }, { status: 403 })
        }
      }
      update.phaseCode = phaseCode
    }
    if (data.notes !== undefined) {
      update.notes = data.notes?.trim() ? data.notes.trim() : null
    }

    if (data.startTime !== undefined || data.hoursWorked !== undefined || data.date !== undefined) {
      const nextDate = (update.date as Date | undefined) ?? existing.date
      const nextStart = (update.startTime as Date | undefined) ?? existing.startTime
      const nextHoursRaw =
        update.hoursWorked !== undefined ? update.hoursWorked : existing.hoursWorked
      const nextHours = Number(nextHoursRaw?.toString?.() ? nextHoursRaw.toString() : nextHoursRaw)
      if (!Number.isFinite(nextHours) || nextHours <= 0) {
        return NextResponse.json({ success: false, error: 'hoursWorked must be > 0' }, { status: 400 })
      }
      await assertNoOverlap({
        userId: session.user.id,
        dateAnchor: nextDate,
        startTime: nextStart,
        hoursWorked: nextHours,
        excludeId: existing.id,
      })
    }

    const updated = await prisma.devTimeEntry.update({
      where: { id: existing.id },
      data: update,
      select: {
        id: true,
        userId: true,
        jobId: true,
        job: { select: { id: true, jobNumber: true, title: true } },
        date: true,
        startTime: true,
        endTime: true,
        hoursWorked: true,
        phaseCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: serializeEntry(updated) })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: error.issues }, { status: 400 })
    }
    if (String(error?.message || '').includes('overlap')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const existing = await prisma.devTimeEntry.findFirst({ where: { id, userId: session.user.id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    await prisma.devTimeEntry.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete entry' }, { status: 500 })
  }
}
