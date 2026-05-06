import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  vendorId: z.string().min(1),
  expectedDate: z.string().optional().nullable(), // yyyy-MM-dd
  notes: z.string().optional().nullable(),
})

function generatePoNumber(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `PO-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const jobId = resolved.id

  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: { jobId },
      orderBy: [{ orderDate: 'desc' }],
      include: {
        vendor: { select: { id: true, name: true } },
        items: { orderBy: [{ createdAt: 'asc' }], include: { part: { select: { id: true, partNumber: true, manufacturer: true } } } },
      },
      take: 200,
    })
    return NextResponse.json({ success: true, data: pos })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load purchase orders'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const jobId = resolved.id

  try {
    const body = createSchema.parse(await request.json())
    const created = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePoNumber(),
        vendorId: body.vendorId,
        jobId,
        status: 'DRAFT',
        expectedDate: body.expectedDate ? new Date(`${body.expectedDate}T12:00:00`) : null,
        notes: body.notes?.trim() || null,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        items: true,
      },
    })
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create purchase order'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'PO number collision, please retry' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

