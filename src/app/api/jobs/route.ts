import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET all jobs with optional search, filtering, and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || '' // 'JOB', 'QUOTE', or empty for all
    const status = searchParams.get('status') || ''
    const customerId = searchParams.get('customerId') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
    const andConditions: any[] = []
    
    // Filter by type (JOB, QUOTE, or both)
    // Note: Quotes can be in Job model (type='QUOTE') OR in Quote model
    let includeQuotesFromQuoteModel = false
    if (type && type === 'JOB') {
      andConditions.push({ type: 'JOB' })
    } else if (type && type === 'QUOTE') {
      // For quotes, we need to check both Job model (type='QUOTE') and Quote model
      andConditions.push({ type: 'QUOTE' })
      includeQuotesFromQuoteModel = true
    } else {
      // Default: show both JOB and QUOTE types
      andConditions.push({ type: { in: ['JOB', 'QUOTE'] } })
      includeQuotesFromQuoteModel = true
    }
    
    // Search filter - search across multiple fields including customer name
    if (search) {
      andConditions.push({
        OR: [
          { jobNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: search, mode: 'insensitive' }
            }
          },
        ],
      })
    }

    // Status filter
    if (status) {
      andConditions.push({ status })
    }

    // Customer filter
    if (customerId) {
      andConditions.push({ customerId })
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      if (andConditions.length === 1) {
        Object.assign(where, andConditions[0])
      } else {
        where.AND = andConditions
      }
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'jobNumber') {
      orderBy = { jobNumber: sortOrder }
    } else if (sortBy === 'title') {
      orderBy = { title: sortOrder }
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder }
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: sortOrder }
    }

    // Fetch jobs with relations
    const [jobs, jobsTotal] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              title: true,
              status: true,
            }
          },
          _count: {
            select: {
              timeEntries: true
            }
          }
        }
      }),
      prisma.job.count({ where })
    ])

    // If we need quotes from Quote model, fetch them separately and combine
    let quotes: any[] = []
    let quotesTotal = 0
    if (includeQuotesFromQuoteModel && (type === 'QUOTE' || !type)) {
      const quotesWhere: any = {}
      const quotesAndConditions: any[] = []
      
      if (search) {
        quotesAndConditions.push({
          OR: [
            { quoteNumber: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: search, mode: 'insensitive' }
              }
            },
          ],
        })
      }
      
      if (status) {
        quotesAndConditions.push({ status })
      }
      
      if (customerId) {
        quotesAndConditions.push({ customerId })
      }
      
      if (quotesAndConditions.length > 0) {
        if (quotesAndConditions.length === 1) {
          Object.assign(quotesWhere, quotesAndConditions[0])
        } else {
          quotesWhere.AND = quotesAndConditions
        }
      }
      
      // Build orderBy for quotes
      let quotesOrderBy: any = { createdAt: 'desc' }
      if (sortBy === 'jobNumber') {
        quotesOrderBy = { quoteNumber: sortOrder }
      } else if (sortBy === 'title') {
        quotesOrderBy = { title: sortOrder }
      } else if (sortBy === 'status') {
        quotesOrderBy = { status: sortOrder }
      } else if (sortBy === 'createdAt') {
        quotesOrderBy = { createdAt: sortOrder }
      } else if (sortBy === 'updatedAt') {
        quotesOrderBy = { updatedAt: sortOrder }
      }
      
      const [quotesData, quotesCount] = await Promise.all([
        prisma.quote.findMany({
          where: quotesWhere,
          skip: type === 'QUOTE' ? skip : 0, // Only paginate if filtering by quotes
          take: type === 'QUOTE' ? limit : 1000, // Get all if showing both
          orderBy: quotesOrderBy,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }),
        prisma.quote.count({ where: quotesWhere })
      ])
      
      quotes = quotesData.map(q => ({
        id: q.id,
        jobNumber: q.quoteNumber,
        quoteNumber: q.quoteNumber,
        title: q.title,
        description: q.description,
        type: 'QUOTE',
        status: q.status,
        priority: 'MEDIUM',
        startDate: q.createdAt,
        endDate: q.validUntil,
        estimatedHours: null,
        actualHours: null,
        assignedToId: q.assignedToId,
        createdById: '',
        customerId: q.customerId,
        workCode: null,
        estimatedCost: q.amount ? Number(q.amount) : null,
        dueTodayPercent: null,
        inQuickBooks: false,
        inLDrive: false,
        fileLink: q.quoteFile,
        relatedQuoteId: null,
        createdFromQuoteId: null,
        convertedAt: null,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        assignedTo: q.assignedTo,
        createdBy: { name: null },
        customer: q.customer,
        _count: { timeEntries: 0 }
      }))
      
      quotesTotal = quotesCount
    }
    
    // Combine jobs and quotes, then sort and paginate if needed
    let allItems = [...jobs, ...quotes]
    let total = jobsTotal + quotesTotal
    
    // If showing both types, we need to sort and paginate the combined list
    if (!type || type === 'all') {
      // Sort combined list
      allItems.sort((a, b) => {
        const aValue = sortBy === 'jobNumber' ? (a.jobNumber || '') :
                      sortBy === 'title' ? (a.title || '') :
                      sortBy === 'status' ? (a.status || '') :
                      sortBy === 'createdAt' ? (a.createdAt?.getTime() || 0) :
                      sortBy === 'updatedAt' ? (a.updatedAt?.getTime() || 0) : 0
        const bValue = sortBy === 'jobNumber' ? (b.jobNumber || '') :
                      sortBy === 'title' ? (b.title || '') :
                      sortBy === 'status' ? (b.status || '') :
                      sortBy === 'createdAt' ? (b.createdAt?.getTime() || 0) :
                      sortBy === 'updatedAt' ? (b.updatedAt?.getTime() || 0) : 0
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      })
      
      // Paginate combined list
      const startIndex = skip
      const endIndex = skip + limit
      allItems = allItems.slice(startIndex, endIndex)
    }

    // Convert Decimal fields to numbers
    const jobsResponse = allItems.map(item => ({
      ...item,
      estimatedHours: item.estimatedHours ? Number(item.estimatedHours) : null,
      actualHours: item.actualHours ? Number(item.actualHours) : null,
      estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : null,
      dueTodayPercent: item.dueTodayPercent ? Number(item.dueTodayPercent) : null
    }))

    return NextResponse.json({
      success: true,
      jobs: jobsResponse,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    )
  }
}
