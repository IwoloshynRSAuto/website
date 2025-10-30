import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Delete in order to respect foreign key constraints
    await prisma.timeEntry.deleteMany()
    await prisma.timesheetSubmission.deleteMany()
    await prisma.quote.deleteMany()
    await prisma.job.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
    await prisma.laborCode.deleteMany()

    return NextResponse.json({ 
      message: 'Database cleared successfully' 
    })
  } catch (error) {
    console.error('Clear database error:', error)
    return NextResponse.json(
      { error: 'Failed to clear database' },
      { status: 500 }
    )
  }
}
