import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  partId: z.string().optional().nullable(),
  name: z.string().optional().nullable(), // manual entry name/description
  partNumber: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  purchasePrice: z.number().nonnegative().default(0),
  markupPercent: z.number().min(0).max(1000).default(20),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  estimatedDelivery: z.string().optional().nullable(), // yyyy-MM-dd
  status: z.enum(['HOLD', 'ORDER', 'PLACED', 'HERE', 'STOCK', 'CUSTOMER_SUPPLIED']).default('HOLD'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bomId: string }> | { bomId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const bomId = resolved.bomId

  try {
    const body = await request.json()
    const parsed = createSchema.parse(body)

    let partNumber = (parsed.partNumber || '').trim()
    let manufacturer = (parsed.manufacturer || '').trim()
    let description = (parsed.description || parsed.name || '').trim() || null

    if (parsed.partId) {
      const p = await prisma.part.findUnique({
        where: { id: parsed.partId },
        select: { partNumber: true, manufacturer: true, description: true },
      })
      if (p) {
        partNumber = p.partNumber
        manufacturer = p.manufacturer
        description = p.description ?? description
      }
    }

    if (!partNumber) {
      // For manual lines, require at least some identifier
      partNumber = 'MANUAL'
    }
    if (!manufacturer) manufacturer = manufacturer || '—'

    const qty = parsed.quantity
    const customerPrice = parsed.purchasePrice * qty * (1 + parsed.markupPercent / 100)

    const created = await prisma.bOMPart.create({
      data: {
        bomId,
        partId: parsed.partId ?? null,
        quantity: qty,
        purchasePrice: parsed.purchasePrice,
        markupPercent: parsed.markupPercent,
        customerPrice,
        manufacturer,
        description,
        source: parsed.source?.trim() || null,
        notes: parsed.notes?.trim() || null,
        estimatedDelivery: parsed.estimatedDelivery ? new Date(`${parsed.estimatedDelivery}T12:00:00`) : null,
        status: parsed.status,
        partNumber,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to add BOM part'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

