import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'

/**
 * DELETE /api/quotes/[id]/files/[fileRecordId]
 * Delete a file from a quote
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; fileRecordId: string }> | { id: string; fileRecordId: string }
  }
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
    const { fileRecordId } = resolvedParams

    // Use QuoteService to handle deletion
    await QuoteService.deleteFile(fileRecordId, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting quote file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete file',
      },
      { status: 500 }
    )
  }
}

