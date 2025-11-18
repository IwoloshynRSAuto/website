import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CustomerService } from '@/lib/customers/service'
import { createCustomerSchema } from '@/lib/customers/schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[GET /api/customers] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const search = searchParams.get('search') || undefined

    console.log('[GET /api/customers] Fetching customers:', { activeOnly, search })

    const customers = await CustomerService.getCustomersWithStats({
      activeOnly,
      search,
    })

    console.log('[GET /api/customers] Found customers:', customers.length)

    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error: any) {
    console.error('[GET /api/customers] Error fetching customers:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch customers',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/customers] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[POST /api/customers] Request body:', body)

    // Pre-process body to convert empty strings to null for optional fields
    const processedBody = {
      ...body,
      email: body.email === '' || body.email === null ? null : body.email,
      phone: body.phone === '' || body.phone === null ? null : body.phone,
      address: body.address === '' || body.address === null ? null : body.address,
      fileLink: body.fileLink === '' || body.fileLink === null ? null : body.fileLink,
    }

    const validatedData = createCustomerSchema.parse(processedBody)
    console.log('[POST /api/customers] Validated data:', validatedData)

    // Check if customer with same name already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { name: validatedData.name },
    })

    if (existingCustomer) {
      console.warn('[POST /api/customers] Customer already exists:', validatedData.name)
      return NextResponse.json(
        {
          success: false,
          error: 'Customer with this name already exists',
        },
        { status: 400 }
      )
    }

    // Prepare data for creation - ensure empty strings become null
    const createData = {
      name: validatedData.name.trim(),
      email: validatedData.email && validatedData.email.trim() !== '' ? validatedData.email.trim() : null,
      phone: validatedData.phone && validatedData.phone.trim() !== '' ? validatedData.phone.trim() : null,
      address: validatedData.address && validatedData.address.trim() !== '' ? validatedData.address.trim() : null,
      fileLink: validatedData.fileLink && validatedData.fileLink.trim() !== '' ? validatedData.fileLink.trim() : null,
    }

    console.log('[POST /api/customers] Creating customer with data:', createData)

    const customer = await prisma.customer.create({
      data: createData,
    })

    console.log('[POST /api/customers] Customer created successfully:', customer.id)

    return NextResponse.json(
      {
        success: true,
        data: customer,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[POST /api/customers] Error creating customer:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    if (error instanceof z.ZodError) {
      console.error('[POST /api/customers] Validation errors:', error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create customer',
      },
      { status: 500 }
    )
  }
}

