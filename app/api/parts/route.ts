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
    const vendorId = searchParams.get('vendorId') || ''
    const brand = searchParams.get('brand') || ''
    const inStock = searchParams.get('inStock') // 'true' or 'false' or null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '500', 10)
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
    const andConditions: any[] = []
    
    if (search) {
      // SQLite doesn't support case-insensitive mode, so we'll filter manually in application
      andConditions.push({
        OR: [
          { partNumber: { contains: search } },
          { manufacturer: { contains: search } },
          { description: { contains: search } },
        ],
      })
    }

    if (category && category.trim() !== '') {
      andConditions.push({ category: category.trim() })
    }

    if (subcategory && subcategory.trim() !== '') {
      // Subcategory uses text matching (contains) instead of exact match
      andConditions.push({ subcategory: { contains: subcategory.trim() } })
    }

    if (brand && brand.trim() !== '') {
      andConditions.push({ manufacturer: { contains: brand.trim() } })
    }

    if (vendorId && vendorId.trim() !== '') {
      // Handle temporary IDs (for vendors not in DB) - format: temp-{vendorName}
      if (vendorId.startsWith('temp-')) {
        const vendorName = vendorId.replace('temp-', '')
        // Filter parts where this vendor is the primarySource
        andConditions.push({
          primarySource: vendorName,
        })
      } else {
        // Get vendor name from vendorId
        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorId.trim() },
          select: { name: true },
        })

        if (vendor) {
          // Filter parts where this vendor is the primarySource OR has vendor prices from this vendor
          andConditions.push({
            OR: [
              { primarySource: vendor.name },
              {
                vendorPrices: {
                  some: {
                    vendorId: vendorId.trim(),
                  },
                },
              },
            ],
          })
        }
      }
    }

    // Combine all conditions with AND
    if (andConditions.length > 0) {
      if (andConditions.length === 1) {
        Object.assign(where, andConditions[0])
      } else {
        where.AND = andConditions
      }
    }

    // Note: in-stock filtering would require inventory tracking, which isn't in the schema
    // For now, we'll skip this filter or implement a basic check based on purchase orders

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
    } else if (sortBy === 'primarySource' || sortBy === 'vendor') {
      // Sort by primary vendor (primarySource field)
      orderBy = [
        { primarySource: sortOrder === 'asc' ? 'asc' : 'desc' },
        { partNumber: 'asc' }
      ] as any
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    }

    // Try to fetch parts with vendor prices and purchase order items
    // If these relations don't exist, fall back to basic query
    let parts: any[]
    let total: number
    
    try {
      [parts, total] = await Promise.all([
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
            },
            vendorPrices: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { effectiveDate: 'desc' },
              take: 1,
            },
            purchaseOrderItems: {
              include: {
                purchaseOrder: {
                  select: {
                    id: true,
                    vendor: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    orderDate: true,
                    receivedDate: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          }
        }),
        prisma.part.count({ where })
      ])
    } catch (relationError: any) {
      // If relations don't exist, fetch without them
      console.warn('Error fetching with relations, falling back to basic query:', relationError?.message)
      console.warn('Full error details:', JSON.stringify(relationError, null, 2))
      try {
        [parts, total] = await Promise.all([
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
              },
            }
          }),
          prisma.part.count({ where })
        ])
      } catch (fallbackError: any) {
        console.error('Fallback query also failed:', fallbackError)
        throw new Error(`Failed to fetch parts: ${fallbackError?.message || 'Unknown error'}`)
      }
    }

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
        ...((part as any).relatedPartsA || []).map((rel: any) => rel.partB),
        ...((part as any).relatedPartsB || []).map((rel: any) => rel.partA)
      ]

      // Get last known price and vendor (if relations exist)
      // Safely access relations that may not exist
      const vendorPrices = (part as any).vendorPrices || []
      const purchaseOrderItems = (part as any).purchaseOrderItems || []
      const lastPrice = vendorPrices?.[0] || null
      const lastPurchase = purchaseOrderItems?.[0] || null
      
      // Calculate lead time from last purchase if available
      let leadTimeDays: number | null = null
      if (lastPurchase?.purchaseOrder?.orderDate && lastPurchase?.purchaseOrder?.receivedDate) {
        try {
          const orderDate = lastPurchase.purchaseOrder.orderDate instanceof Date 
            ? lastPurchase.purchaseOrder.orderDate 
            : new Date(lastPurchase.purchaseOrder.orderDate)
          const receivedDate = lastPurchase.purchaseOrder.receivedDate instanceof Date
            ? lastPurchase.purchaseOrder.receivedDate
            : new Date(lastPurchase.purchaseOrder.receivedDate)
          const days = Math.ceil(
            (receivedDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          leadTimeDays = days
        } catch (e) {
          // Ignore date parsing errors
          console.warn('Error calculating lead time:', e)
        }
      }

      return {
        ...part,
        purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
        secondarySources,
        relatedParts,
        lastKnownPrice: lastPrice ? {
          price: lastPrice.price,
          vendor: lastPrice.vendor,
          date: lastPrice.effectiveDate instanceof Date 
            ? lastPrice.effectiveDate.toISOString()
            : new Date(lastPrice.effectiveDate).toISOString(),
        } : null,
        lastPurchased: lastPurchase ? {
          date: lastPurchase.purchaseOrder.orderDate instanceof Date
            ? lastPurchase.purchaseOrder.orderDate.toISOString()
            : new Date(lastPurchase.purchaseOrder.orderDate).toISOString(),
          vendor: lastPurchase.purchaseOrder.vendor,
          price: lastPurchase.unitPrice,
          leadTimeDays,
        } : null,
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
    } catch (error: any) {
    console.error('Error fetching parts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch parts',
        message: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
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

