import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const partsService = await prisma.partsService.findUnique({
      where: { id: params.id }
    })

    if (!partsService) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(partsService)
  } catch (error) {
    console.error('Error fetching parts/service:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parts/service' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    const partsService = await prisma.partsService.update({
      where: { id: params.id },
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
        inQuickBooks: body.inQuickBooks,
        inLDrive: body.inLDrive,
        quoteNumber: body.quoteNumber,
        invoiced: body.invoiced,
        dateInvoiced: body.dateInvoiced ? new Date(body.dateInvoiced) : null,
        notes: body.notes
      }
    })

    return NextResponse.json(partsService)
  } catch (error: any) {
    console.error('Error updating parts/service:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update parts/service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.partsService.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting parts/service:', error)
    return NextResponse.json(
      { error: 'Failed to delete parts/service' },
      { status: 500 }
    )
  }
}

