import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'

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

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Use QuoteService to handle upload
    const result = await QuoteService.uploadFile(id, file, session.user.id)

    // Get updated quote with file records
    const { prisma } = await import('@/lib/prisma')
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        quote,
        fileRecord: result,
      },
    })
  } catch (error: any) {
    console.error('Error uploading quote file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload file',
      },
      { status: 500 }
    )
  }
}

