import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  vendorId: z.string().min(1),
  price: z.number().nonnegative(),
  leadTimeDays: z.number().int().nonnegative().optional().nullable(),
  effectiveDate: z.string().optional().nullable(), // yyyy-MM-dd
  minimumOrderQuantity: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  try {
    const body = await request.json()
    const parsed = createSchema.parse(body)

    const created = await prisma.vendorPartPrice.create({
      data: {
        partId: resolved.id,
        vendorId: parsed.vendorId,
        price: parsed.price,
        leadTimeDays: parsed.leadTimeDays ?? null,
        effectiveDate: parsed.effectiveDate ? new Date(`${parsed.effectiveDate}T12:00:00`) : new Date(),
        minimumOrderQuantity: parsed.minimumOrderQuantity ?? null,
        notes: parsed.notes?.trim() || null,
      },
      include: { vendor: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to add vendor price'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'A vendor price already exists for this effective date' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

