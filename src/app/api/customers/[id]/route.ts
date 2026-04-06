import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth/authorization'
import { z } from 'zod'

const patchCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  fileLink: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await Promise.resolve(params)
    const customer = await prisma.customer.findUnique({
      where: { id: resolved.id },
    })

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: customer })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load customer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const resolved = await Promise.resolve(params)
    const body = await request.json()
    const parsed = patchCustomerSchema.parse(body)

    if (parsed.email !== undefined) {
      const e = parsed.email?.trim() || null
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
      }
    }

    const data: {
      name?: string
      email?: string | null
      phone?: string | null
      address?: string | null
      fileLink?: string | null
      isActive?: boolean
    } = {}
    if (parsed.name != null) data.name = parsed.name.trim()
    if (parsed.email !== undefined) data.email = parsed.email?.trim() || null
    if (parsed.phone !== undefined) data.phone = parsed.phone?.trim() || null
    if (parsed.address !== undefined) data.address = parsed.address?.trim() || null
    if (parsed.fileLink !== undefined) data.fileLink = parsed.fileLink?.trim() || null
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive

    const customer = await prisma.customer.update({
      where: { id: resolved.id },
      data,
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update customer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
