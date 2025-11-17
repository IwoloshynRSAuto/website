import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQuotePDF } from '@/lib/pdf/quote-pdf'
import { getStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/quotes/[id]/export
 * Generate and export a quote as PDF
 */
export async function POST(
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

    // Get quote
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        linkedBOMs: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const fileRecordId = await generateQuotePDF({
      quote,
      userId: session.user.id,
    })

    // Get FileRecord with storage info
    const fileRecord = await prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    })

    if (!fileRecord) {
      return NextResponse.json(
        { success: false, error: 'Failed to create file record' },
        { status: 500 }
      )
    }

    // Get download URL
    const storage = await getStorage()
    const downloadUrl = await storage.getSignedUrl(fileRecord.storagePath, 3600)

    // Return PDF for download
    const pdfBuffer = await storage.download(fileRecord.storagePath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${quote.quoteNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting quote PDF:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export PDF',
      },
      { status: 500 }
    )
  }
}

