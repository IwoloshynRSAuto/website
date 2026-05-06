import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  vendorId: z.string().min(1),
  expectedDate: z.string().optional().nullable(), // yyyy-MM-dd
  notes: z.string().optional().nullable(),
})

function generatePoNumber(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `PO-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const jobId = resolved.id

  try {
    const body = bodySchema.parse(await req.json())

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        quote: {
          include: {
            linkedBOMs: {
              include: { parts: { orderBy: { createdAt: 'asc' } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    const bom = job.quote?.linkedBOMs?.[0]
    if (!bom) return NextResponse.json({ success: false, error: 'No linked quote BOM found for this job' }, { status: 400 })
    if (bom.parts.length === 0) return NextResponse.json({ success: false, error: 'Quote BOM has no parts' }, { status: 400 })

    const expectedDate = body.expectedDate ? new Date(`${body.expectedDate}T12:00:00`) : null

    const created = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: generatePoNumber(),
          vendorId: body.vendorId,
          jobId,
          status: 'DRAFT',
          expectedDate,
          notes: body.notes?.trim() || `Created from quote BOM ${bom.id}`,
        },
      })

      await tx.purchaseOrderItem.createMany({
        data: bom.parts.map((p) => ({
          purchaseOrderId: po.id,
          partId: p.partId,
          description: `${p.partNumber}${p.description ? ` — ${p.description}` : ''}`,
          quantity: p.quantity,
          unitPrice: Number(p.purchasePrice),
          totalPrice: Number(p.purchasePrice) * p.quantity,
          notes: p.source || null,
        })),
      })

      return await tx.purchaseOrder.findUnique({
        where: { id: po.id },
        include: {
          vendor: { select: { id: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
        },
      })
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create PO from BOM'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'PO number collision, please retry' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

