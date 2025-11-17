import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EquipmentService } from '@/lib/equipment/service'
import { createEquipmentSchema, equipmentFilterSchema } from '@/lib/equipment/schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = equipmentFilterSchema.parse({
      type: searchParams.get('type') || undefined,
      serviceStatus: searchParams.get('serviceStatus') || undefined,
      assignedArea: searchParams.get('assignedArea') || undefined,
      search: searchParams.get('search') || undefined,
    })

    const equipment = await EquipmentService.getEquipment(filters)

    return NextResponse.json({
      success: true,
      data: equipment,
    })
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createEquipmentSchema.parse(body)

    const equipment = await EquipmentService.createEquipment(validatedData, session.user.id)

    return NextResponse.json({
      success: true,
      data: equipment,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating equipment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create equipment' },
      { status: 500 }
    )
  }
}


