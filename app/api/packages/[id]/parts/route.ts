import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addPartSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
  quantity: z.number().int().min(1).optional().default(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: packageId } = resolvedParams

    const body = await request.json()
    
    // Ensure quantity is a valid positive integer
    if (body.quantity !== undefined && body.quantity !== null) {
      const qty = Number(body.quantity)
      if (!isNaN(qty) && qty > 0) {
        body.quantity = Math.floor(qty) // Ensure it's an integer
      } else {
        body.quantity = 1 // Default to 1 if invalid
      }
    } else {
      body.quantity = 1 // Default if not provided
    }
    
    const validatedData = addPartSchema.parse(body)

    // Check if part already exists in package
    const existing = await prisma.packagePart.findUnique({
      where: {
        packageId_partId: {
          packageId,
          partId: validatedData.partId,
        },
      },
    })

    if (existing) {
      // Update quantity if part already exists - add to existing quantity
      const newQuantity = existing.quantity + validatedData.quantity
      const packagePart = await prisma.packagePart.update({
        where: {
          packageId_partId: {
            packageId,
            partId: validatedData.partId,
          },
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          part: true,
        },
      })
      return NextResponse.json(packagePart, { status: 200 })
    }

    const packagePart = await prisma.packagePart.create({
      data: {
        packageId,
        partId: validatedData.partId,
        quantity: validatedData.quantity || 1,
      },
      include: {
        part: true,
      },
    })

    return NextResponse.json(packagePart, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Error adding part to package:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add part to package'
    return NextResponse.json(
      { error: errorMessage },
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: packageId } = resolvedParams

    const { searchParams } = new URL(request.url)
    const partId = searchParams.get('partId')

    if (!partId) {
      return NextResponse.json(
        { error: 'Part ID is required' },
        { status: 400 }
      )
    }

    await prisma.packagePart.delete({
      where: {
        packageId_partId: {
          packageId,
          partId,
        },
      },
    })

    return NextResponse.json({ message: 'Part removed from package' })
  } catch (error) {
    console.error('Error removing part from package:', error)
    return NextResponse.json(
      { error: 'Failed to remove part from package' },
      { status: 500 }
    )
  }
}

