import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EquipmentService } from '@/lib/equipment/service'
import { createMaintenanceLogSchema } from '@/lib/equipment/schemas'
import { z } from 'zod'

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
    const body = await request.json()
    const validatedData = createMaintenanceLogSchema.parse({
      ...body,
      equipmentId: resolvedParams.id,
    })

    const log = await EquipmentService.createMaintenanceLog(validatedData)

    return NextResponse.json({
      success: true,
      data: log,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating maintenance log:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create maintenance log' },
      { status: 500 }
    )
  }
}


