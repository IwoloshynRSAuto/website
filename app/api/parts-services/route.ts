import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const partsServices = await prisma.partsService.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(partsServices)
  } catch (error) {
    console.error('Error fetching parts and services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parts and services' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create parts/services
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    const partsService = await prisma.partsService.create({
      data: {
        jobNumber: body.jobNumber,
        createdBy: body.createdBy,
        customerName: body.customerName,
        custContact: body.custContact,
        description: body.description,
        vendor: body.vendor,
        startDate: body.startDate ? new Date(body.startDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        jobStatus: body.jobStatus,
        inQuickBooks: body.inQuickBooks || false,
        inLDrive: body.inLDrive || false,
        quoteNumber: body.quoteNumber,
        invoiced: body.invoiced,
        dateInvoiced: body.dateInvoiced ? new Date(body.dateInvoiced) : null,
        notes: body.notes
      }
    })

    return NextResponse.json(partsService, { status: 201 })
  } catch (error: any) {
    console.error('Error creating parts/service:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create parts/service' },
      { status: 500 }
    )
  }
}

