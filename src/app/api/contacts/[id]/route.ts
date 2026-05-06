import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolved = await Promise.resolve(params)
    const id = resolved.id

    const body = await request.json()
    const parsed = patchContactSchema.parse(body)

    if (parsed.email !== undefined) {
      const e = parsed.email?.trim() || null
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
      }
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.email !== undefined ? { email: parsed.email?.trim() || null } : {}),
        ...(parsed.phone !== undefined ? { phone: parsed.phone?.trim() || null } : {}),
        ...(parsed.position !== undefined ? { position: parsed.position?.trim() || null } : {}),
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

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update contact'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const resolved = await Promise.resolve(params)
    const id = resolved.id

    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete contact'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

