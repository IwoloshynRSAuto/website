import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// Dynamic import to avoid bundling AWS SDK
const getStorage = async () => {
  const { getStorage: getStorageFn } = await import('@/lib/storage')
  return getStorageFn()
}

/**
 * GET /api/storage/files/[path]
 * Download a file from storage
 * Requires authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> | { path: string } }
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
    const path = decodeURIComponent(resolvedParams.path)

    // Security: prevent path traversal
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      )
    }

    const storage = await getStorage()

    // Check if file exists
    const exists = await storage.exists(path)
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Download file
    const buffer = await storage.download(path)

    // Determine content type from file extension
    const ext = path.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      json: 'application/json',
    }
    const contentType = ext ? contentTypeMap[ext] || 'application/octet-stream' : 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.split('/').pop()}"`,
      },
    })
  } catch (error: any) {
    console.error('File download error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download file',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

