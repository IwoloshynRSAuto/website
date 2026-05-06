import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const quoteId = resolved.id

  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        linkedBOMs: {
          include: { parts: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!quote) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 })

    if (quote.linkedBOMs.length > 0) {
      return NextResponse.json({ success: true, data: quote.linkedBOMs[0] })
    }

    const created = await prisma.$transaction(async (tx) => {
      const bom = await tx.bOM.create({
        data: {
          name: `Quote ${quote.quoteNumber} BOM`,
          status: 'DRAFT',
          linkedQuoteId: quoteId,
        },
        include: { parts: { orderBy: { createdAt: 'asc' } } },
      })

      await tx.quote.update({
        where: { id: quoteId },
        data: { linkedBOMs: { connect: { id: bom.id } } },
      })

      return bom
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create BOM'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

