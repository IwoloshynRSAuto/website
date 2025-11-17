import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateCustomerSchema } from '@/lib/customers/schemas'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    const body = await request.json()
    const validatedData = updateCustomerSchema.parse(body)

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId }
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

    // Prepare update data - handle empty strings and nulls
    const updateData: any = {
      name: validatedData.name,
      isActive: validatedData.isActive ?? true,
    }
    
    // Handle optional fields - convert empty strings to null
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email === '' || validatedData.email === null ? null : validatedData.email
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone === '' || validatedData.phone === null ? null : validatedData.phone
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address === '' || validatedData.address === null ? null : validatedData.address
    }
    if (validatedData.fileLink !== undefined) {
      updateData.fileLink = validatedData.fileLink === '' || validatedData.fileLink === null ? null : validatedData.fileLink
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
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
      where: { id: customerId }
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

