import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'
import { updateExpenseReportSchema } from '@/lib/timekeeping/schemas'

/**
 * PATCH /api/timekeeping/expenses/[id]
 * Update expense report status (submit/approve/reject/pay)
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
    const validatedData = updateExpenseReportSchema.partial().parse(body)

    // Use TimekeepingService to update report
    const updated = await TimekeepingService.updateExpenseReport(
      id,
      validatedData,
      session.user.id
    )

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
    console.error('Error updating expense report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update expense report',
      },
      { status: 500 }
    )
  }
}

