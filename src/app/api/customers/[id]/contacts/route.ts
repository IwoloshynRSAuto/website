import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolved = await Promise.resolve(params)
    const customerId = resolved.id

    const contacts = await prisma.contact.findMany({
      where: { customerId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        customerId: true,
        name: true,
        email: true,
        phone: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: contacts })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load contacts'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolved = await Promise.resolve(params)
    const customerId = resolved.id

    const body = await request.json()
    const parsed = createContactSchema.parse(body)

    const emailTrim = parsed.email?.trim() || null
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        customerId,
        name: parsed.name.trim(),
        email: emailTrim,
        phone: parsed.phone?.trim() || null,
        position: parsed.position?.trim() || null,
      },
      select: {
        id: true,
        customerId: true,
        name: true,
        email: true,
        phone: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create contact'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

