import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const unlinkBOMSchema = z.object({
  bomId: z.string(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: quoteId } = resolvedParams

    const body = await request.json()
    const { bomId } = unlinkBOMSchema.parse(body)

    // Verify the quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        linkedBOMs: {
          where: { id: bomId },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Check if BOM is actually linked to this quote
    if (quote.linkedBOMs.length === 0) {
      return NextResponse.json({ error: 'BOM is not linked to this quote' }, { status: 400 })
    }

    // Disconnect the BOM from the quote
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        linkedBOMs: {
          disconnect: { id: bomId },
        },
      },
    })

    return NextResponse.json({ message: 'BOM unlinked successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error unlinking BOM:', error)
    return NextResponse.json(
      { error: 'Failed to unlink BOM' },
      { status: 500 }
    )
  }
}

