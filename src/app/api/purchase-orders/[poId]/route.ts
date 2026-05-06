import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  expectedDate: z.string().nullable().optional(), // yyyy-MM-dd
  notes: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ poId: string }> | { poId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const poId = resolved.poId

  try {
    const body = patchSchema.parse(await req.json())

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        ...(body.expectedDate !== undefined
          ? { expectedDate: body.expectedDate ? new Date(`${body.expectedDate}T12:00:00`) : null }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update purchase order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

