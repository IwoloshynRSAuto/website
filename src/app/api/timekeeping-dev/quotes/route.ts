import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QuoteStatus } from '@prisma/client'

/** Quotes available for booking time (same numbering used on timesheet job rows). */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const quotes = await prisma.quote.findMany({
      where: {
        isActive: true,
        status: { notIn: [QuoteStatus.LOST, QuoteStatus.CANCELLED] },
      },
      select: {
        id: true,
        quoteNumber: true,
        title: true,
        status: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { quoteNumber: 'desc' }],
      take: 600,
    })

    return NextResponse.json({
      success: true,
      data: quotes,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch quotes'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
