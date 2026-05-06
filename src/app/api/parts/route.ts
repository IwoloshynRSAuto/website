import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createPartSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  primarySource: z.string().optional().nullable(),
  secondarySources: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(Math.max(limitRaw ? Number(limitRaw) : 200, 1), 1000)

    const parts = await prisma.part.findMany({
      where: {
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(search
          ? {
              OR: [
                { partNumber: { contains: search, mode: 'insensitive' } },
                { manufacturer: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        partNumber: true,
        manufacturer: true,
        description: true,
        category: true,
        subcategory: true,
        primarySource: true,
        secondarySources: true,
        purchasePrice: true,
        createdAt: true,
        updatedAt: true,
        vendorPrices: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
          select: {
            id: true,
            price: true,
            leadTimeDays: true,
            effectiveDate: true,
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    })

    const shaped = parts.map((p) => {
      const latest = p.vendorPrices[0] || null
      return {
        ...p,
        latestVendorPrice: latest
          ? {
              id: latest.id,
              vendorId: latest.vendor.id,
              vendorName: latest.vendor.name,
              price: latest.price,
              leadTimeDays: latest.leadTimeDays,
              effectiveDate: latest.effectiveDate,
            }
          : null,
      }
    })

    return NextResponse.json({ success: true, data: shaped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch parts'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createPartSchema.parse(body)

    const created = await prisma.part.create({
      data: {
        partNumber: parsed.partNumber.trim(),
        manufacturer: parsed.manufacturer.trim(),
        description: parsed.description?.trim() || null,
        category: parsed.category?.trim() || null,
        subcategory: parsed.subcategory?.trim() || null,
        primarySource: parsed.primarySource?.trim() || null,
        secondarySources: parsed.secondarySources?.trim() || null,
        purchasePrice: parsed.purchasePrice ?? null,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create part'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'A part with this part number already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

