import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  quoteId: z.string().min(1),
  replaceExisting: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> | { templateId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  try {
    const body = bodySchema.parse(await req.json())
    const replaceExisting = body.replaceExisting ?? true

    const template = await prisma.bOM.findUnique({
      where: { id: resolved.templateId },
      include: { parts: { orderBy: { createdAt: 'asc' } } },
    })
    if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })

    const quote = await prisma.quote.findUnique({
      where: { id: body.quoteId },
      include: { linkedBOMs: { orderBy: { createdAt: 'asc' }, include: { parts: true } } },
    })
    if (!quote) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 })

    const quoteBom = quote.linkedBOMs[0]
      ? quote.linkedBOMs[0]
      : await prisma.$transaction(async (tx) => {
          const createdBom = await tx.bOM.create({
            data: { name: `Quote ${quote.quoteNumber} BOM`, status: 'DRAFT', linkedQuoteId: quote.id },
            include: { parts: true },
          })
          await tx.quote.update({ where: { id: quote.id }, data: { linkedBOMs: { connect: { id: createdBom.id } } } })
          return createdBom
        })

    const updated = await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.bOMPart.deleteMany({ where: { bomId: quoteBom.id } })
      }

      if (template.parts.length > 0) {
        await tx.bOMPart.createMany({
          data: template.parts.map((p) => ({
            bomId: quoteBom.id,
            partId: p.partId,
            quantity: p.quantity,
            purchasePrice: p.purchasePrice,
            markupPercent: p.markupPercent,
            customerPrice: p.customerPrice,
            manufacturer: p.manufacturer,
            description: p.description,
            source: p.source,
            notes: p.notes,
            estimatedDelivery: p.estimatedDelivery,
            status: p.status,
            partNumber: p.partNumber,
          })),
        })
      }

      return await tx.bOM.findUnique({
        where: { id: quoteBom.id },
        include: { parts: { orderBy: { createdAt: 'asc' } } },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to load template'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

