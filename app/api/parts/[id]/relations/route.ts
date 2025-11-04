import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const relationSchema = z.object({
  relatedPartId: z.string().min(1, 'Related part ID is required'),
})

// POST add related part (bidirectional)
export async function POST(
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
    const validated = relationSchema.parse(body)
    const { relatedPartId } = validated

    // Prevent self-relation
    if (id === relatedPartId) {
      return NextResponse.json(
        { error: 'A part cannot be related to itself' },
        { status: 400 }
      )
    }

    // Check if both parts exist
    const [partA, partB] = await Promise.all([
      prisma.part.findUnique({ where: { id } }),
      prisma.part.findUnique({ where: { id: relatedPartId } })
    ])

    if (!partA || !partB) {
      return NextResponse.json(
        { error: 'One or both parts not found' },
        { status: 404 }
      )
    }

    // Check if relation already exists (in either direction)
    const existingRelation = await prisma.partRelation.findFirst({
      where: {
        OR: [
          { partAId: id, partBId: relatedPartId },
          { partAId: relatedPartId, partBId: id }
        ]
      }
    })

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Parts are already related' },
        { status: 400 }
      )
    }

    // Create bidirectional relation (only need to create one, we can query both directions)
    // We'll use the lexicographically smaller ID as partA to ensure consistency
    const [smallerId, largerId] = id < relatedPartId ? [id, relatedPartId] : [relatedPartId, id]
    
    const relation = await prisma.partRelation.create({
      data: {
        partAId: smallerId,
        partBId: largerId,
      },
      include: {
        partA: {
          select: {
            id: true,
            partNumber: true,
            manufacturer: true,
            description: true,
          }
        },
        partB: {
          select: {
            id: true,
            partNumber: true,
            manufacturer: true,
            description: true,
          }
        }
      }
    })

    // Return the related part (the one that's not the current part)
    const relatedPart = relation.partA.id === id ? relation.partB : relation.partA

    return NextResponse.json(relatedPart, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error adding related part:', error)
    return NextResponse.json(
      { error: 'Failed to add related part' },
      { status: 500 }
    )
  }
}

// DELETE remove related part (bidirectional)
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

    const { searchParams } = new URL(request.url)
    const relatedPartId = searchParams.get('relatedPartId')

    if (!relatedPartId) {
      return NextResponse.json(
        { error: 'relatedPartId is required' },
        { status: 400 }
      )
    }

    // Delete relation in either direction
    const deleted = await prisma.partRelation.deleteMany({
      where: {
        OR: [
          { partAId: id, partBId: relatedPartId },
          { partAId: relatedPartId, partBId: id }
        ]
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Relation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Related part removed successfully' })
  } catch (error) {
    console.error('Error removing related part:', error)
    return NextResponse.json(
      { error: 'Failed to remove related part' },
      { status: 500 }
    )
  }
}

