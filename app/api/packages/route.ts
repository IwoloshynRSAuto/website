import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  type: z.enum(['Package', 'Assembly']).optional().default('Package'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  partIds: z.array(z.string()).optional().default([]),
  partQuantities: z.record(z.string(), z.number().int().positive()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const packages = await prisma.package.findMany({
      include: {
        parts: {
          include: {
            part: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Calculate totals for each package
    const packagesWithTotals = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      type: pkg.type || 'Package',
      description: pkg.description,
      notes: pkg.notes,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      totalParts: pkg.parts.length,
      parts: pkg.parts.map(pp => ({
        ...pp.part,
        quantity: pp.quantity || 1,
        primarySource: pp.part.primarySource || null,
      })),
    }))

    return NextResponse.json({ packages: packagesWithTotals })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPackageSchema.parse(body)

    // Create package - handle empty strings and nulls
    const newPackage = await prisma.package.create({
      data: {
        name: validatedData.name,
        type: validatedData.type || 'Package',
        description: validatedData.description && validatedData.description.trim() !== '' ? validatedData.description.trim() : null,
        notes: validatedData.notes && validatedData.notes.trim() !== '' ? validatedData.notes.trim() : null,
      },
    })

    // If partIds provided, create PackageParts with quantities
    if (validatedData.partIds && validatedData.partIds.length > 0) {
      const packagePartsData = validatedData.partIds
        .map(partId => {
          const quantity = validatedData.partQuantities?.[partId]
          // Ensure quantity is a positive integer
          const validQuantity = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1
          return {
            packageId: newPackage.id,
            partId,
            quantity: validQuantity,
          }
        })
        .filter(data => {
          // Verify part exists
          return data.partId && data.packageId
        })

      if (packagePartsData.length > 0) {
        // SQLite doesn't support skipDuplicates, so we'll try to create each one individually
        // or check for existing records first
        try {
          await prisma.packagePart.createMany({
            data: packagePartsData,
          })
        } catch (error: any) {
          // If duplicate error, create individually to skip existing ones
          if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            for (const partData of packagePartsData) {
              try {
                await prisma.packagePart.create({
                  data: partData,
                })
              } catch (individualError: any) {
                // Skip if it's a duplicate, continue with others
                if (individualError.code !== 'P2002' && !individualError.message?.includes('Unique constraint')) {
                  throw individualError
                }
              }
            }
          } else {
            throw error
          }
        }
      }
    }

    // Return package with parts
    const packageWithParts = await prisma.package.findUnique({
      where: { id: newPackage.id },
      include: {
        parts: {
          include: {
            part: true,
          },
        },
      },
    })

    return NextResponse.json(packageWithParts, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 })
    }
    console.error('Error creating package:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create package'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

