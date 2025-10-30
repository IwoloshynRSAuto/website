import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Export all data
    const exportData = {
      users: await prisma.user.findMany(),
      customers: await prisma.customer.findMany(),
      jobs: await prisma.job.findMany(),
      laborCodes: await prisma.laborCode.findMany({ orderBy: { code: 'asc' } }),
      timeEntries: await prisma.timeEntry.findMany(),
      timesheetSubmissions: await prisma.timesheetSubmission.findMany(),
      exportDate: new Date().toISOString()
    }

    const filename = `database-export-${new Date().toISOString().split('T')[0]}.json`
    
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
