import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const search = (searchParams.get('search') || '').trim()

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        contactName: true,
        email: true,
        phone: true,
        website: true,
        category: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: vendors })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createVendorSchema.parse(body)

    const created = await prisma.vendor.create({
      data: {
        name: parsed.name.trim(),
        contactName: parsed.contactName?.trim() || null,
        email: parsed.email?.trim() || null,
        phone: parsed.phone?.trim() || null,
        address: parsed.address?.trim() || null,
        website: parsed.website?.trim() || null,
        category: parsed.category?.trim() || null,
        notes: parsed.notes?.trim() || null,
        isActive: parsed.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        contactName: true,
        email: true,
        phone: true,
        website: true,
        category: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create vendor'
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ success: false, error: 'A vendor with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

