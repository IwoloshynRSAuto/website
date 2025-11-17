import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/admin/clear-approvals
 * Clear all timesheet approvals (ADMIN ONLY)
 * This will delete all SUBMITTED, APPROVED, and REJECTED submissions
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow ADMIN users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    console.log('Clearing all timesheet approvals...')
    
    // Delete all submissions that are not DRAFT
    const deleteResult = await prisma.timesheetSubmission.deleteMany({
      where: {
        status: {
          in: ['SUBMITTED', 'APPROVED', 'REJECTED']
        }
      }
    })

    console.log(`Deleted ${deleteResult.count} timesheet submissions`)
    
    // Also reset any DRAFT submissions that have approval/rejection data
    const resetResult = await prisma.timesheetSubmission.updateMany({
      where: {
        status: 'DRAFT',
        OR: [
          { approvedAt: { not: null } },
          { rejectedAt: { not: null } },
          { approvedById: { not: null } },
          { rejectedById: { not: null } }
        ]
      },
      data: {
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
        submittedAt: null,
      }
    })

    console.log(`Reset ${resetResult.count} DRAFT submissions with approval data`)

    return NextResponse.json({
      success: true,
      message: 'All approvals cleared successfully',
      deleted: deleteResult.count,
      reset: resetResult.count,
    })
  } catch (error: any) {
    console.error('Error clearing approvals:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear approvals' },
      { status: 500 }
    )
  }
}

