import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// Dynamic import to avoid bundling AWS SDK
const getStorage = async () => {
  const { getStorage: getStorageFn } = await import('@/lib/storage')
  return getStorageFn()
}

/**
 * GET /api/storage/test
 * Health check endpoint for storage adapter
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const storage = await getStorage()
    const health = await storage.healthCheck()

    return NextResponse.json({
      success: true,
      data: {
        adapter: process.env.STORAGE_ADAPTER || 'local',
        healthy: health.healthy,
        message: health.message,
        config: {
          basePath: process.env.STORAGE_BASE_PATH || process.cwd() + '/storage',
          s3Endpoint: process.env.S3_ENDPOINT || null,
          s3Bucket: process.env.S3_BUCKET || null,
        },
      },
    })
  } catch (error: any) {
    console.error('Storage health check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Storage health check failed',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

