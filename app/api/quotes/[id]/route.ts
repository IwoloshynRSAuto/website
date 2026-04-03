import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'
import { updateQuoteSchema } from '@/lib/quotes/schemas'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET single quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        linkedBOMs: {
          include: {
            parts: {
              include: {
                originalPart: {
                  select: {
                    id: true,
                    partNumber: true,
                    manufacturer: true,
                    description: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quote,
    })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

// PATCH update quote
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validated = updateQuoteSchema.partial().parse(body)

    // Use QuoteService to update quote
    const quote = await QuoteService.updateQuote(id, validated, session.user.id)

    return NextResponse.json({
      success: true,
      data: quote,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.flatten(),
        },
        { status: 400 }
      )
    }
    console.error('Error updating quote:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update quote',
      },
      { status: 500 }
    )
  }
}

// DELETE quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const quote = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Delete the quote (cascade will handle related records)
    await prisma.quote.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete quote',
      },
      { status: 500 }
    )
  }
}

