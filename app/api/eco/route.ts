import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, oldHours, newHours, oldCost, newCost, reasonForChange, laborChanges } = body

    if (!jobId || oldHours === undefined || newHours === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the job to verify it exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { 
        quote: true,
        quotedLabor: true 
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Debug: Check what's in the session
    console.log('Session user email:', session.user.email)

    // Find user by email (since session.user.id might be Azure AD ID or email)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Allow ECO for any job, not just converted quotes
    // if (job.type !== 'JOB' || !job.relatedQuoteId) {
    //   return NextResponse.json({ error: 'ECO can only be submitted for jobs converted from quotes' }, { status: 400 })
    // }

    // Calculate current quoted hours from database
    const currentQuotedHours = job.quotedLabor.reduce((sum, ql) => sum + ql.estimatedHours, 0)
    const currentQuotedCost = job.quotedLabor.reduce((sum, ql) => sum + ql.estimatedCost, 0)
    
    // Use the values from the request if provided, otherwise use current values
    const finalOldHours = oldHours !== undefined ? oldHours : currentQuotedHours
    const finalNewHours = newHours !== undefined ? newHours : currentQuotedHours
    const finalOldCost = oldCost !== undefined ? oldCost : currentQuotedCost
    const finalNewCost = newCost !== undefined ? newCost : currentQuotedCost

    // Generate ECO number
    const ecoCount = await prisma.engineeringChangeOrder.count({
      where: { jobId }
    })
    const ecoNumber = `ECO-${job.jobNumber}-${String(ecoCount + 1).padStart(3, '0')}`

    // Generate revision letter
    const revisionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    const revision = `Rev ${revisionLetters[ecoCount] || 'Z'}`

    // Debug logging
    console.log('Creating ECO for job:', jobId, 'by user:', user.email)

    // Create the ECO using the calculated values
    const eco = await prisma.engineeringChangeOrder.create({
      data: {
        ecoNumber,
        jobId,
        oldHours: finalOldHours,
        newHours: finalNewHours,
        oldCost: finalOldCost,
        newCost: finalNewCost,
        reasonForChange: reasonForChange || 'ECO submitted',
        laborChanges: laborChanges ? JSON.stringify(laborChanges) : null,
        submittedById: user.id,
        revision
      }
    })

    // Fetch the ECO with relations separately to avoid foreign key issues
    const ecoWithRelations = await prisma.engineeringChangeOrder.findUnique({
      where: { id: eco.id },
      include: {
        submittedBy: {
          select: { name: true, email: true }
        },
        job: {
          select: { jobNumber: true, title: true }
        }
      }
    })

    return NextResponse.json(ecoWithRelations || eco)
  } catch (error) {
    console.error('Error creating ECO:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const ecos = await prisma.engineeringChangeOrder.findMany({
      where: { jobId },
      include: {
        submittedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    return NextResponse.json(ecos)
  } catch (error) {
    console.error('Error fetching ECOs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
