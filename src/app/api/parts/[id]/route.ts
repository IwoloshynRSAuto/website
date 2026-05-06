import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  partNumber: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  primarySource: z.string().nullable().optional(),
  secondarySources: z.string().nullable().optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const part = await prisma.part.findUnique({
    where: { id: resolved.id },
    include: {
      vendorPrices: {
        orderBy: { effectiveDate: 'desc' },
        include: { vendor: { select: { id: true, name: true } } },
      },
    },
  })
  if (!part) return NextResponse.json({ success: false, error: 'Part not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: part })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  try {
    const body = await request.json()
    const parsed = patchSchema.parse(body)

    const updated = await prisma.part.update({
      where: { id: resolved.id },
      data: {
        ...(parsed.partNumber !== undefined ? { partNumber: parsed.partNumber.trim() } : {}),
        ...(parsed.manufacturer !== undefined ? { manufacturer: parsed.manufacturer.trim() } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description?.trim() || null } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category?.trim() || null } : {}),
        ...(parsed.subcategory !== undefined ? { subcategory: parsed.subcategory?.trim() || null } : {}),
        ...(parsed.primarySource !== undefined ? { primarySource: parsed.primarySource?.trim() || null } : {}),
        ...(parsed.secondarySources !== undefined ? { secondarySources: parsed.secondarySources?.trim() || null } : {}),
        ...(parsed.purchasePrice !== undefined ? { purchasePrice: parsed.purchasePrice } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update part'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'A part with this part number already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

