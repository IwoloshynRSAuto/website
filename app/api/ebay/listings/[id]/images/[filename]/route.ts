import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

// GET /api/ebay/listings/[id]/images/[filename] - Serve listing images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> | { id: string; filename: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { id, filename } = resolvedParams

    const imagePath = join(process.cwd(), 'storage', 'listings', id, 'images', filename)

    if (!existsSync(imagePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const imageBuffer = await readFile(imagePath)
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error: any) {
    console.error('[Listings] Error serving image:', error)
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 })
  }
}


