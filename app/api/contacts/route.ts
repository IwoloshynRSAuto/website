import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const contactSchema = z.object({
  customerId: z.string(),
  name: z.string().min(1),
  email: z.union([
    z.string().email('Invalid email format'),
    z.literal(''),
    z.null()
  ]).optional(),
  phone: z.union([z.string(), z.literal(''), z.null()]).optional(),
  position: z.union([z.string(), z.literal(''), z.null()]).optional(),
})

// GET all contacts for a customer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const contacts = await prisma.contact.findMany({
      where: { customerId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// POST create new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = contactSchema.parse(body)

    // Check customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validated.customerId },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Handle empty strings and null values properly
    const contact = await prisma.contact.create({
      data: {
        customerId: validated.customerId,
        name: validated.name,
        email: validated.email === '' || validated.email === null || validated.email === undefined ? null : validated.email,
        phone: validated.phone === '' || validated.phone === null || validated.phone === undefined ? null : validated.phone,
        position: validated.position === '' || validated.position === null || validated.position === undefined ? null : validated.position,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 })
    }
    console.error('Error creating contact:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create contact'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

