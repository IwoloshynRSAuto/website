import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> | { path: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { path: filePath } = resolvedParams

    // Security: Only allow files from storage/quotes directory
    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(filePath)
    
    // Prevent directory traversal attacks - extract just the filename
    let filename = decodedPath
    
    // Remove any path components, keep only the filename
    if (decodedPath.includes('/') || decodedPath.includes('\\')) {
      filename = decodedPath.split(/[/\\]/).pop() || decodedPath
    }
    
    // Prevent directory traversal
    if (filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    
    // Construct safe path
    const storageDir = join(process.cwd(), 'storage', 'quotes')
    const safePath = join(storageDir, filename)
    
    // Verify the resolved path is within the storage/quotes directory
    if (!safePath.startsWith(storageDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    if (!existsSync(safePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read and return file
    const fileBuffer = await readFile(safePath)
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = 
      ext === 'pdf' ? 'application/pdf' :
      ext === 'doc' ? 'application/msword' :
      ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
      'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error serving quote file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    )
  }
}

