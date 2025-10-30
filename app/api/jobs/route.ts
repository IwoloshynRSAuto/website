import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createJobSchema = z.object({
  type: z.enum(['QUOTE', 'JOB']).default('JOB'),
  jobNumber: z.string().min(1, 'Job number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedHours: z.number().optional().nullable(),
  startDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  assignedToId: z.string().optional().nullable(),
  // New fields
  customerId: z.string().optional().nullable(),
  quoteId: z.string().optional().nullable(),
  quotedAmount: z.number().optional().nullable(),
  workCode: z.string().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  dueTodayPercent: z.number().optional().nullable(),
  fileLink: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Get the user from database
    let user = null
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
    }
    
    // Fallback: use first admin user if current user not found
    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })
    }
    
    // If still no user, use any user
    if (!user) {
      user = await prisma.user.findFirst()
    }

    if (!user) {
      return NextResponse.json({ error: 'No users found in database. Please create a user first.' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createJobSchema.parse(body)

    // Check if job number already exists
    const existingJob = await prisma.job.findUnique({
      where: { jobNumber: validatedData.jobNumber }
    })

    if (existingJob) {
      return NextResponse.json(
        { error: 'Job number already exists' },
        { status: 400 }
      )
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber: validatedData.jobNumber,
        title: validatedData.title,
        description: validatedData.description || null,
        type: validatedData.type,
        status: validatedData.status || (validatedData.type === 'QUOTE' ? 'QUOTE' : 'ACTIVE'),
        priority: validatedData.priority,
        estimatedHours: validatedData.estimatedHours || null,
        customerId: validatedData.customerId || null,
        quoteId: validatedData.quoteId || null,
        estimatedCost: validatedData.quotedAmount || validatedData.estimatedCost || null,
        assignedToId: validatedData.assignedToId || null,
        workCode: validatedData.workCode || null,
        dueTodayPercent: validatedData.dueTodayPercent || null,
        fileLink: validatedData.fileLink || null,
        // Set start date to today if not provided (only for jobs, not quotes)
        startDate: validatedData.type === 'JOB' ? (validatedData.startDate || new Date()) : validatedData.startDate,
        endDate: validatedData.endDate || null,
        createdById: user.id,
      },
      include: {
        assignedTo: true,
        createdBy: true,
      }
    })

    // Convert Decimal fields to numbers for client compatibility
    const jobResponse = {
      ...job,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
      actualHours: job.actualHours ? Number(job.actualHours) : null,
    }

    return NextResponse.json(jobResponse, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedToId')

    const where: any = {}
    if (status) where.status = status
    if (assignedToId) where.assignedToId = assignedToId

    const jobs = await prisma.job.findMany({
      where,
      include: {
        assignedTo: true,
        createdBy: true,
        customer: true,
        quotedLabor: {
          include: {
            laborCode: true
          }
        },
        laborCodes: true,
        timeEntries: {
          include: {
            laborCode: true
          }
        },
        _count: {
          select: {
            timeEntries: true
          }
        }
      },
      // Show highest job numbers first (e.g., 3940, then downwards)
      orderBy: { jobNumber: 'desc' }
    })

    // Convert Decimal fields to numbers for client compatibility
    const jobsResponse = jobs.map(job => ({
      ...job,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
      actualHours: job.actualHours ? Number(job.actualHours) : null,
      estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
      dueTodayPercent: job.dueTodayPercent ? Number(job.dueTodayPercent) : null,
    }))

    return NextResponse.json(jobsResponse)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


