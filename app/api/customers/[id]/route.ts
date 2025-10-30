import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  fileLink: z.string().optional().or(z.literal(''))
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        jobs: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: { jobs: true }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = updateCustomerSchema.parse(body)

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingCustomer.name) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { name: validatedData.name }
      })

      if (duplicateCustomer) {
        return NextResponse.json(
          { error: 'Customer with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        email: validatedData.email === '' ? null : validatedData.email,
        phone: validatedData.phone === '' ? null : validatedData.phone,
        address: validatedData.address === '' ? null : validatedData.address,
        fileLink: validatedData.fileLink === '' ? null : validatedData.fileLink
      }
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error('Error updating customer:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if customer has associated jobs
    if (existingCustomer._count.jobs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with associated jobs. Please reassign or delete the jobs first.' },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

