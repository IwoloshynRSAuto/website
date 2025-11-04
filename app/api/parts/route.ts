import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPartSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  primarySource: z.string().optional().nullable(),
  secondarySources: z.array(z.string()).optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
})

const updatePartSchema = createPartSchema.partial()

// GET all parts with optional search and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const subcategory = searchParams.get('subcategory') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '500', 10)
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
    
    if (search) {
      // SQLite doesn't support case-insensitive mode, so we'll filter manually in application
      where.OR = [
        { partNumber: { contains: search } },
        { manufacturer: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (category && category.trim() !== '') {
      where.category = category.trim()
    }

    if (subcategory && subcategory.trim() !== '') {
      // Subcategory uses text matching (contains) instead of exact match
      where.subcategory = { contains: subcategory.trim() }
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'partNumber') {
      orderBy = { partNumber: sortOrder }
    } else if (sortBy === 'manufacturer') {
      orderBy = { manufacturer: sortOrder }
    } else if (sortBy === 'category') {
      // For category sorting, handle nulls by sorting them last
      // Use a two-step approach: sort by category, then by partNumber for consistency
      orderBy = [
        { category: sortOrder === 'asc' ? 'asc' : 'desc' },
        { partNumber: 'asc' }
      ] as any
    } else if (sortBy === 'subcategory') {
      orderBy = [
        { subcategory: sortOrder === 'asc' ? 'asc' : 'desc' },
        { partNumber: 'asc' }
      ] as any
    } else if (sortBy === 'purchasePrice') {
      orderBy = { purchasePrice: sortOrder }
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    }

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
      prisma.part.count({ where })
    ])

    // Parse secondarySources JSON and merge related parts
    const partsResponse = parts.map(part => {
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

      return {
        ...part,
        purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
        secondarySources,
        relatedParts,
      }
    })

    return NextResponse.json({
      parts: partsResponse,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    )
  }
}

// POST create new part
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createPartSchema.parse(body)

    // Check if part number already exists
    const existingPart = await prisma.part.findUnique({
      where: { partNumber: validated.partNumber }
    })

    if (existingPart) {
      return NextResponse.json(
        { error: 'Part number already exists' },
        { status: 400 }
      )
    }

    // Convert secondarySources array to JSON string
    const secondarySourcesJson = validated.secondarySources
      ? JSON.stringify(validated.secondarySources)
      : null

    const part = await prisma.part.create({
      data: {
        partNumber: validated.partNumber,
        manufacturer: validated.manufacturer,
        description: validated.description || null,
        category: validated.category && validated.category.trim() !== '' ? validated.category.trim() : null,
        subcategory: validated.subcategory && validated.subcategory.trim() !== '' ? validated.subcategory.trim() : null,
        primarySource: validated.primarySource || null,
        secondarySources: secondarySourcesJson,
        purchasePrice: validated.purchasePrice || null,
      }
    })

    return NextResponse.json({
      ...part,
      purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
      secondarySources: validated.secondarySources || [],
      relatedParts: [],
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating part:', error)
    return NextResponse.json(
      { error: 'Failed to create part' },
      { status: 500 }
    )
  }
}

