import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EquipmentService } from '@/lib/equipment/service'
import { updateEquipmentSchema } from '@/lib/equipment/schemas'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const equipment = await EquipmentService.getEquipmentById(resolvedParams.id)

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: equipment,
    })
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const validatedData = updateEquipmentSchema.parse(body)

    const equipment = await EquipmentService.updateEquipment(resolvedParams.id, validatedData)

    return NextResponse.json({
      success: true,
      data: equipment,
    })
  } catch (error: any) {
    console.error('Error updating equipment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update equipment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    await EquipmentService.deleteEquipment(resolvedParams.id)

    return NextResponse.json({
      success: true,
      message: 'Equipment deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    )
  }
}


