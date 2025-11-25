import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeImagesStub } from '@/lib/ebay/ai-stub'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

// POST /api/ebay/ai/analyze - AI image analysis stub
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const listingId = formData.get('listingId') as string | null

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      )
    }

    // Save files temporarily for analysis
    const tempDir = join(process.cwd(), 'storage', 'temp-uploads')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    const imagePaths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop() || 'jpg'
      const tempPath = join(tempDir, `temp-${Date.now()}-${i}.${ext}`)
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(tempPath, buffer)
      
      imagePaths.push(tempPath)
    }

    // Call AI stub
    const result = await analyzeImagesStub(imagePaths, listingId || undefined)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('[AI] Error analyzing images:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze images'
      },
      { status: 500 }
    )
  }
}


