import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'

/**
 * POST /api/timekeeping/expenses/[id]/receipt
 * Upload receipt for expense report
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

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Use TimekeepingService to handle upload
    const fileRecordId = await TimekeepingService.uploadExpenseReceipt(
      id,
      file,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: { fileRecordId },
    })
  } catch (error: any) {
    console.error('Error uploading receipt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload receipt',
      },
      { status: 500 }
    )
  }
}

