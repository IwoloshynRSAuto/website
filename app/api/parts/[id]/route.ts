import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePartSchema = z.object({
  partNumber: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  primarySource: z.string().optional().nullable(),
  secondarySources: z.array(z.string()).optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
})

// GET single part
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        relatedPartsA: {
          include: {
            partB: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        },
        relatedPartsB: {
          include: {
            partA: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        }
      }
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // Parse secondarySources JSON
    let secondarySources: string[] = []
    try {
      if (part.secondarySources) {
        secondarySources = JSON.parse(part.secondarySources)
      }
    } catch (e) {
      // If not valid JSON, treat as empty array
    }

    // Get all related parts (from both directions)
    const relatedParts = [
      ...part.relatedPartsA.map(rel => rel.partB),
      ...part.relatedPartsB.map(rel => rel.partA)
    ]

    return NextResponse.json({
      ...part,
      purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
      secondarySources,
      relatedParts,
    })
  } catch (error) {
    console.error('Error fetching part:', error)
    return NextResponse.json(
      { error: 'Failed to fetch part' },
      { status: 500 }
    )
  }
}

// PATCH update part
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validated = updatePartSchema.partial().parse(body)

    // If part number is being updated, check for duplicates
    if (validated.partNumber) {
      const existingPart = await prisma.part.findUnique({
        where: { partNumber: validated.partNumber }
      })
      if (existingPart && existingPart.id !== id) {
        return NextResponse.json(
          { error: 'Part number already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (validated.partNumber) updateData.partNumber = validated.partNumber
    if (validated.manufacturer) updateData.manufacturer = validated.manufacturer
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.category !== undefined) updateData.category = validated.category && validated.category.trim() !== '' ? validated.category.trim() : null
    if (validated.subcategory !== undefined) updateData.subcategory = validated.subcategory && validated.subcategory.trim() !== '' ? validated.subcategory.trim() : null
    if (validated.primarySource !== undefined) updateData.primarySource = validated.primarySource
    if (validated.secondarySources !== undefined) {
      updateData.secondarySources = validated.secondarySources
        ? JSON.stringify(validated.secondarySources)
        : null
    }
    if (validated.purchasePrice !== undefined) updateData.purchasePrice = validated.purchasePrice

    const updatedPart = await prisma.part.update({
      where: { id },
      data: updateData,
      include: {
        relatedPartsA: {
          include: {
            partB: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        },
        relatedPartsB: {
          include: {
            partA: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        }
      }
    })

    // Parse secondarySources JSON
    let secondarySources: string[] = []
    try {
      if (updatedPart.secondarySources) {
        secondarySources = JSON.parse(updatedPart.secondarySources)
      }
    } catch (e) {
      // If not valid JSON, treat as empty array
    }

    // Get all related parts
    const relatedParts = [
      ...updatedPart.relatedPartsA.map(rel => rel.partB),
      ...updatedPart.relatedPartsB.map(rel => rel.partA)
    ]

    return NextResponse.json({
      ...updatedPart,
      purchasePrice: updatedPart.purchasePrice ? Number(updatedPart.purchasePrice) : null,
      secondarySources,
      relatedParts,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating part:', error)
    return NextResponse.json(
      { error: 'Failed to update part' },
      { status: 500 }
    )
  }
}

// DELETE part
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // Delete all related part relations (cascade)
    await prisma.partRelation.deleteMany({
      where: {
        OR: [
          { partAId: id },
          { partBId: id }
        ]
      }
    })

    // Delete the part
    await prisma.part.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Part deleted successfully' })
  } catch (error) {
    console.error('Error deleting part:', error)
    return NextResponse.json(
      { error: 'Failed to delete part' },
      { status: 500 }
    )
  }
}

