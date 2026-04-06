import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/quotes/[id]/duplicate
 * Duplicate a quote with a new quote number
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/quotes/[id]/duplicate] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: originalQuoteId } = resolvedParams

    console.log('[POST /api/quotes/[id]/duplicate] Duplicating quote:', {
      originalQuoteId,
      userId: session.user.id,
    })

    // Get the original quote with all related data
    const originalQuote = await prisma.quote.findUnique({
      where: { id: originalQuoteId },
      include: {
        customer: true,
        linkedBOMs: {
          include: {
            parts: {
              include: {
                originalPart: true,
              },
            },
          },
        },
        fileRecords: {
          select: {
            id: true,
            storagePath: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            metadata: true,
          },
        },
      },
    })

    if (!originalQuote) {
      console.warn('[POST /api/quotes/[id]/duplicate] Quote not found:', originalQuoteId)
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Generate new quote number
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        quoteNumber: { startsWith: 'Q' },
      },
    })
    let quoteNumber = 'Q0001'
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.replace('Q', ''), 10)
      if (!isNaN(lastNum)) {
        quoteNumber = `Q${String(lastNum + 1).padStart(4, '0')}`
      }
    }

    // Create duplicate quote
    const duplicatedQuote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: `${originalQuote.title} (Copy)`,
        description: originalQuote.description,
        customerId: originalQuote.customerId,
        amount: originalQuote.amount,
        status: 'DRAFT', // Always start duplicates as DRAFT
        quoteType: originalQuote.quoteType,
        isActive: true,
        paymentTerms: originalQuote.paymentTerms,
        estimatedHours: originalQuote.estimatedHours,
        hourlyRate: originalQuote.hourlyRate,
        laborCost: originalQuote.laborCost,
        materialCost: originalQuote.materialCost,
        overheadCost: originalQuote.overheadCost,
        profitMargin: originalQuote.profitMargin,
        customerContactName: originalQuote.customerContactName,
        customerContactEmail: originalQuote.customerContactEmail,
        customerContactPhone: originalQuote.customerContactPhone,
        validUntil: originalQuote.validUntil,
        // Link to same BOMs
        linkedBOMs: {
          connect: originalQuote.linkedBOMs.map(bom => ({ id: bom.id })),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
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
            },
          },
        },
      },
    })

    // Create initial revision for the duplicate
    try {
      await prisma.quoteRevision.create({
        data: {
          quoteId: duplicatedQuote.id,
          revisionNumber: 1,
          createdById: session.user.id,
          data: {
            quoteNumber: duplicatedQuote.quoteNumber,
            title: duplicatedQuote.title,
            description: duplicatedQuote.description,
            status: duplicatedQuote.status,
            amount: duplicatedQuote.amount,
            customerId: duplicatedQuote.customerId,
            customerName: duplicatedQuote.customer?.name,
            duplicatedFrom: originalQuote.quoteNumber,
            duplicatedAt: new Date().toISOString(),
          },
        },
      })
    } catch (auditError) {
      console.warn('[POST /api/quotes/[id]/duplicate] Failed to create revision:', auditError)
      // Don't fail the request if revision creation fails
    }

    console.log('[POST /api/quotes/[id]/duplicate] Quote duplicated successfully:', {
      originalQuoteId,
      newQuoteId: duplicatedQuote.id,
      newQuoteNumber: duplicatedQuote.quoteNumber,
    })

    return NextResponse.json({
      success: true,
      data: duplicatedQuote,
    })
  } catch (error: any) {
    console.error('[POST /api/quotes/[id]/duplicate] Error duplicating quote:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

