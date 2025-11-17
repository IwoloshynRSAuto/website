import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorage } from '@/lib/storage'

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

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const path = decodeURIComponent(resolvedParams.path)

    // Security: prevent path traversal
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Ensure path is within quotes directory
    const storagePath = path.startsWith('quotes/') ? path : `quotes/${path}`

    const storage = await getStorage()

    // Check if file exists
    const exists = await storage.exists(storagePath)
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Download file
    const buffer = await storage.download(storagePath)

    // Determine content type from file extension
    const ext = storagePath.split('.').pop()?.toLowerCase()
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
    const filename = storagePath.split('/').pop() || storagePath

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error serving quote file:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve file',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

