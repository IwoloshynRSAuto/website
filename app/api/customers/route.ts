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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const search = searchParams.get('search') || undefined

    const customers = await CustomerService.getCustomersWithStats({
      activeOnly,
      search,
    })

    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createCustomerSchema.parse(body)

    // Check if customer with same name already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { name: validatedData.name },
    })

    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer with this name already exists',
        },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        fileLink: validatedData.fileLink || null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: customer,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating customer:', error)
    if (error instanceof z.ZodError) {
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

