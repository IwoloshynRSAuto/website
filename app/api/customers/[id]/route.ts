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
      console.error('[GET /api/customers/[id]] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    console.log('[GET /api/customers/[id]] Fetching customer:', customerId)

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
      console.warn('[GET /api/customers/[id]] Customer not found:', customerId)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error: any) {
    console.error('[GET /api/customers/[id]] Error fetching customer:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customer' },
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
      console.error('[PUT /api/customers/[id]] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    const body = await request.json()
    console.log('[PUT /api/customers/[id]] Request body:', { customerId, body })

    // Pre-process body to convert empty strings to null for optional fields
    const processedBody = {
      ...body,
      email: body.email === '' || body.email === null ? null : body.email,
      phone: body.phone === '' || body.phone === null ? null : body.phone,
      address: body.address === '' || body.address === null ? null : body.address,
      fileLink: body.fileLink === '' || body.fileLink === null ? null : body.fileLink,
    }

    const validatedData = updateCustomerSchema.parse(processedBody)
    console.log('[PUT /api/customers/[id]] Validated data:', validatedData)

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!existingCustomer) {
      console.warn('[PUT /api/customers/[id]] Customer not found:', customerId)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingCustomer.name) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { name: validatedData.name }
      })

      if (duplicateCustomer) {
        console.warn('[PUT /api/customers/[id]] Duplicate customer name:', validatedData.name)
        return NextResponse.json(
          { success: false, error: 'Customer with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data - handle empty strings and nulls
    const updateData: any = {
      name: validatedData.name.trim(),
      isActive: validatedData.isActive ?? existingCustomer.isActive,
    }
    
    // Handle optional fields - convert empty strings to null and trim
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email && validatedData.email.trim() !== '' ? validatedData.email.trim() : null
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone && validatedData.phone.trim() !== '' ? validatedData.phone.trim() : null
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address && validatedData.address.trim() !== '' ? validatedData.address.trim() : null
    }
    if (validatedData.fileLink !== undefined) {
      updateData.fileLink = validatedData.fileLink && validatedData.fileLink.trim() !== '' ? validatedData.fileLink.trim() : null
    }

    console.log('[PUT /api/customers/[id]] Updating customer with data:', updateData)

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
    })

    console.log('[PUT /api/customers/[id]] Customer updated successfully:', customerId)

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
    })
  } catch (error: any) {
    console.error('[PUT /api/customers/[id]] Error updating customer:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    if (error instanceof z.ZodError) {
      console.error('[PUT /api/customers/[id]] Validation errors:', error.errors)
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
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
      console.error('[DELETE /api/customers/[id]] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: customerId } = resolvedParams

    console.log('[DELETE /api/customers/[id]] Deleting customer:', customerId)

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
      console.warn('[DELETE /api/customers/[id]] Customer not found:', customerId)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if customer has associated jobs
    if (existingCustomer._count.jobs > 0) {
      console.warn('[DELETE /api/customers/[id]] Customer has associated jobs:', {
        customerId,
        jobsCount: existingCustomer._count.jobs,
      })
      return NextResponse.json(
        { success: false, error: 'Cannot delete customer with associated jobs. Please reassign or delete the jobs first.' },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id: customerId }
    })

    console.log('[DELETE /api/customers/[id]] Customer deleted successfully:', customerId)

    return NextResponse.json({ 
      success: true,
      message: 'Customer deleted successfully' 
    })
  } catch (error: any) {
    console.error('[DELETE /api/customers/[id]] Error deleting customer:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

