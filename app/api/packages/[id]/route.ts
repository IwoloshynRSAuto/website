import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const packageData = await prisma.package.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            part: {
              include: {
                relatedPartsA: {
                  include: {
                    partB: {
                      select: {
                        id: true,
                        partNumber: true,
                        manufacturer: true,
                        description: true,
                      },
                    },
                  },
                },
                relatedPartsB: {
                  include: {
                    partA: {
                      select: {
                        id: true,
                        partNumber: true,
                        manufacturer: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Transform data
    const result = {
      ...packageData,
      parts: packageData.parts.map(pp => {
        const part = pp.part
        const relatedParts = [
          ...part.relatedPartsA.map(rel => rel.partB),
          ...part.relatedPartsB.map(rel => rel.partA),
        ]

        return {
          ...part,
          purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
          relatedParts,
          quantity: pp.quantity,
        }
      }),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching package:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package' },
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validatedData = updatePackageSchema.partial().parse(body)

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: validatedData,
      include: {
        parts: {
          include: {
            part: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPackage)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Failed to update package' },
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
    const { id } = resolvedParams

    await prisma.package.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Package deleted successfully' })
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    )
  }
}

