import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateLaborCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  isActive: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laborCodeId = params.id

    const laborCode = await prisma.laborCode.findUnique({
      where: { id: laborCodeId }
    })

    if (!laborCode) {
      return NextResponse.json(
        { error: 'Labor code not found' },
        { status: 404 }
      )
    }

    // Convert Decimal fields to numbers for client compatibility
    const laborCodeResponse = {
      ...laborCode,
      hourlyRate: Number(laborCode.hourlyRate)
    }

    return NextResponse.json(laborCodeResponse)
  } catch (error) {
    console.error('Error fetching labor code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor code' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laborCodeId = params.id
    const body = await request.json()
    const validatedData = updateLaborCodeSchema.parse(body)

    // Check if labor code exists
    const existingLaborCode = await prisma.laborCode.findUnique({
      where: { id: laborCodeId }
    })

    if (!existingLaborCode) {
      return NextResponse.json(
        { error: 'Labor code not found' },
        { status: 404 }
      )
    }

    // Check if code already exists (if code is being updated)
    if (validatedData.code && validatedData.code !== existingLaborCode.code) {
      const codeExists = await prisma.laborCode.findUnique({
        where: { code: validatedData.code }
      })

      if (codeExists) {
        return NextResponse.json(
          { error: 'Labor code already exists' },
          { status: 400 }
        )
      }
    }

    const laborCode = await prisma.laborCode.update({
      where: { id: laborCodeId },
      data: {
        ...validatedData,
        hourlyRate: validatedData.hourlyRate
      }
    })

    // Convert Decimal fields to numbers for client compatibility
    const laborCodeResponse = {
      ...laborCode,
      hourlyRate: Number(laborCode.hourlyRate)
    }

    return NextResponse.json(laborCodeResponse)
  } catch (error) {
    console.error('Error updating labor code:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update labor code' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laborCodeId = params.id

    // Check if labor code exists
    const existingLaborCode = await prisma.laborCode.findUnique({
      where: { id: laborCodeId }
    })

    if (!existingLaborCode) {
      return NextResponse.json(
        { error: 'Labor code not found' },
        { status: 404 }
      )
    }

    // Check if labor code is being used in any time entries
    const timeEntriesCount = await prisma.timeEntry.count({
      where: { laborCodeId: laborCodeId }
    })

    if (timeEntriesCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete labor code that is being used in time entries' },
        { status: 400 }
      )
    }

    await prisma.laborCode.delete({
      where: { id: laborCodeId }
    })

    return NextResponse.json(
      { message: 'Labor code deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting labor code:', error)
    return NextResponse.json(
      { error: 'Failed to delete labor code' },
      { status: 500 }
    )
  }
}





