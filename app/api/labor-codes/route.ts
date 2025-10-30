import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLaborCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  isActive: z.boolean().default(true)
})

const updateLaborCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  isActive: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createLaborCodeSchema.parse(body)

    // Check if code already exists
    const existingCode = await prisma.laborCode.findUnique({
      where: { code: validatedData.code }
    })

    if (existingCode) {
      return NextResponse.json(
        { error: 'Labor code already exists' },
        { status: 400 }
      )
    }

    const laborCode = await prisma.laborCode.create({
      data: {
        ...validatedData,
        hourlyRate: validatedData.hourlyRate
      }
    })

    return NextResponse.json(laborCode, { status: 201 })
  } catch (error) {
    console.error('Error creating labor code:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create labor code' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (category) {
      where.category = category
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const laborCodes = await prisma.laborCode.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { code: 'asc' }
      ]
    })

    // Convert Decimal fields to numbers for client compatibility
    const laborCodesResponse = laborCodes.map(code => ({
      ...code,
      hourlyRate: Number(code.hourlyRate)
    }))

    return NextResponse.json(laborCodesResponse)
  } catch (error) {
    console.error('Error fetching labor codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor codes' },
      { status: 500 }
    )
  }
}





