import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'
import { updateServiceReportSchema } from '@/lib/timekeeping/schemas'

/**
 * PATCH /api/timekeeping/service-reports/[id]
 * Update a service report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validatedData = updateServiceReportSchema.partial().parse(body)

    // Use TimekeepingService to update report
    const updated = await TimekeepingService.updateServiceReport(id, validatedData)

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      )
    }
    console.error('Error updating service report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update service report',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/timekeeping/service-reports/[id]
 * Delete a service report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const { prisma } = await import('@/lib/prisma')
    await prisma.serviceReport.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Service report deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting service report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete service report',
      },
      { status: 500 }
    )
  }
}

