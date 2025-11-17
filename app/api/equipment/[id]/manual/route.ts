import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EquipmentService } from '@/lib/equipment/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      )
    }

    const result = await EquipmentService.uploadManual(
      resolvedParams.id,
      file,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading manual:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload manual' },
      { status: 500 }
    )
  }
}


