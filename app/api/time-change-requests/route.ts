import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'

const createChangeRequestSchema = z.object({
  timesheetId: z.string().optional(),
  requestedClockInTime: z.string().transform((val) => new Date(val)),
  requestedClockOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  reason: z.string().min(1, 'Reason is required'),
  date: z.string()
})

// POST /api/time-change-requests - Create a time change request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createChangeRequestSchema.parse(body)

    // Verify user exists - handle missing managerId column
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          position: true,
          wage: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
          // Explicitly exclude managerId
        }
      })
    } catch (dbError: any) {
      const errorMsg = String(dbError?.message || dbError?.code || '')
      if (errorMsg.includes('managerId') && errorMsg.includes('does not exist')) {
        // Use raw SQL to fetch user without managerId
        const userResults = await prisma.$queryRaw(
          Prisma.sql`SELECT id, email, name, role, position, wage, phone, "isActive", "createdAt", "updatedAt" FROM users WHERE id = ${session.user.id}`
        ) as any[]
        user = userResults?.[0] || null
      } else {
        throw dbError
      }
    }

    if (!user && session.user.email) {
      try {
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            position: true,
            wage: true,
            phone: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
            // Explicitly exclude managerId
          }
        })
      } catch (dbError: any) {
        const errorMsg = String(dbError?.message || dbError?.code || '')
        if (errorMsg.includes('managerId') && errorMsg.includes('does not exist')) {
          // Use raw SQL to fetch user without managerId
          const userResults = await prisma.$queryRaw(
            Prisma.sql`SELECT id, email, name, role, position, wage, phone, "isActive", "createdAt", "updatedAt" FROM users WHERE email = ${session.user.email}`
          ) as any[]
          user = userResults?.[0] || null
        } else {
          throw dbError
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 404 }
      )
    }

    // Round requested times
    const roundedClockIn = roundToNearest15Minutes(validatedData.requestedClockInTime)
    const roundedClockOut = validatedData.requestedClockOutTime 
      ? roundToNearest15Minutes(validatedData.requestedClockOutTime)
      : null

    // Parse date
    const [year, month, day] = validatedData.date.split('-').map(Number)
    const dateForDb = new Date(year, month - 1, day, 12, 0, 0, 0)

    // Check for overlaps with existing entries (excluding the timesheet being modified if it exists)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Query existing entries - handle missing geolocation columns
    let existingEntries
    try {
      existingEntries = await prisma.timesheet.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startOfDay,
            lte: endOfDay
          },
          id: validatedData.timesheetId ? { not: validatedData.timesheetId } : undefined
        },
        include: {
          jobEntries: true
        }
      })
    } catch (dbError: any) {
      // If geolocation columns don't exist, use select to exclude them
      const errorMsg = String(dbError?.message || dbError?.code || '')
      // Be more specific - only catch actual geolocation column errors
      const isGeoError = errorMsg.includes('geoLat') || 
                        errorMsg.includes('geoLon') ||
                        errorMsg.includes('geoAccuracy') ||
                        errorMsg.includes('locationDenied') ||
                        errorMsg.includes('clockOutGeoLat') ||
                        errorMsg.includes('clockOutGeoLon') ||
                        (errorMsg.includes('does not exist') && (
                          errorMsg.includes('geo') || 
                          errorMsg.includes('location')
                        ))
      
      if (isGeoError) {
        console.warn('[API POST /time-change-requests] Geolocation columns not found, querying without them. Error:', errorMsg.substring(0, 200))
        existingEntries = await prisma.timesheet.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startOfDay,
              lte: endOfDay
            },
            id: validatedData.timesheetId ? { not: validatedData.timesheetId } : undefined
          },
          select: {
            id: true,
            userId: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
            totalHours: true,
            status: true,
            jobEntries: true
            // Explicitly exclude geolocation fields
          }
        })
      } else {
        throw dbError
      }
    }

    // Check if this would be a job-only timesheet (midnight clock-in, no clock-out)
    const clockInLocal = new Date(roundedClockIn.getFullYear(), roundedClockIn.getMonth(), roundedClockIn.getDate(),
                                  roundedClockIn.getHours(), roundedClockIn.getMinutes(), roundedClockIn.getSeconds())
    const isJobOnlyTimesheet = clockInLocal.getHours() === 0 && 
                                clockInLocal.getMinutes() === 0 && 
                                !roundedClockOut

    if (!isJobOnlyTimesheet) {
      // Check for overlaps with existing attendance entries
      const newIn = roundedClockIn
      const newOut = roundedClockOut || new Date(year, month - 1, day, 23, 59, 59, 999)

      const hasOverlap = existingEntries.some(entry => {
        // Skip job-only timesheets
        const entryIn = new Date(entry.clockInTime)
        const entryInLocal = new Date(entryIn.getFullYear(), entryIn.getMonth(), entryIn.getDate(), 
                                      entryIn.getHours(), entryIn.getMinutes(), entryIn.getSeconds())
        const isEntryJobOnly = entryInLocal.getHours() === 0 && 
                               entryInLocal.getMinutes() === 0 && 
                               !entry.clockOutTime

        if (isEntryJobOnly) {
          return false // Job-only timesheets don't count as overlaps
        }

        const existingIn = entryIn
        const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(year, month - 1, day, 23, 59, 59, 999)

        // Overlap occurs if: newIn < existingOut && newOut > existingIn
        return newIn < existingOut && newOut > existingIn
      })

      if (hasOverlap) {
        return NextResponse.json(
          {
            success: false,
            error: 'This requested time change would overlap with an existing entry. Please adjust the times.',
            details: 'Time entries cannot overlap on the same date.',
          },
          { status: 400 }
        )
      }
    }

    // Get original timesheet values if it exists
    let timesheet = null
    let originalClockIn: Date | null = null
    let originalClockOut: Date | null = null
    
    if (validatedData.timesheetId) {
      // Query timesheet - handle missing geolocation columns
      try {
        timesheet = await prisma.timesheet.findUnique({
          where: { id: validatedData.timesheetId },
          select: {
            id: true,
            userId: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
            totalHours: true,
            status: true
            // Explicitly exclude geolocation fields
          }
        })
      } catch (dbError: any) {
        // If geolocation columns don't exist, use select to exclude them
        const errorMsg = String(dbError?.message || dbError?.code || '')
        // Be more specific - only catch actual geolocation column errors
        const isGeoError = errorMsg.includes('geoLat') || 
                          errorMsg.includes('geoLon') ||
                          errorMsg.includes('geoAccuracy') ||
                          errorMsg.includes('locationDenied') ||
                          errorMsg.includes('clockOutGeoLat') ||
                          errorMsg.includes('clockOutGeoLon') ||
                          (errorMsg.includes('does not exist') && (
                            errorMsg.includes('geo') || 
                            errorMsg.includes('location')
                          ))
        
        if (isGeoError) {
          console.warn('[API POST /time-change-requests] Geolocation columns not found, querying timesheet without them. Error:', errorMsg.substring(0, 200))
          timesheet = await prisma.timesheet.findUnique({
            where: { id: validatedData.timesheetId },
            select: {
              id: true,
              userId: true,
              date: true,
              clockInTime: true,
              clockOutTime: true,
              totalHours: true,
              status: true
              // Explicitly exclude geolocation fields
            }
          })
        } else {
          throw dbError
        }
      }
      
      if (timesheet) {
        originalClockIn = new Date(timesheet.clockInTime)
        originalClockOut = timesheet.clockOutTime ? new Date(timesheet.clockOutTime) : null
      }
    }

    // Create change request (DO NOT update the timesheet - wait for approval)
    // Handle missing geolocation columns in timesheet relation
    let changeRequest
    try {
      changeRequest = await prisma.timeChangeRequest.create({
        data: {
          timesheetId: validatedData.timesheetId || null,
          userId: user.id,
          date: dateForDb,
          originalClockInTime: originalClockIn || roundedClockIn, // Use requested time if no original
          originalClockOutTime: originalClockOut,
          requestedClockInTime: roundedClockIn,
          requestedClockOutTime: roundedClockOut,
          reason: validatedData.reason,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          timesheet: true
        }
      })
    } catch (dbError: any) {
      // Check for schema mismatch errors (geolocation or managerId)
      const errorMsg = String(dbError?.message || dbError?.code || '')
      const isGeoError = errorMsg.includes('geoLat') || 
                        errorMsg.includes('geoLon') ||
                        errorMsg.includes('geoAccuracy') ||
                        errorMsg.includes('locationDenied') ||
                        errorMsg.includes('clockOutGeoLat') ||
                        errorMsg.includes('clockOutGeoLon') ||
                        (errorMsg.includes('does not exist') && (
                          errorMsg.includes('geo') || 
                          errorMsg.includes('location')
                        ))
      const isManagerIdError = errorMsg.includes('managerId') && errorMsg.includes('does not exist')
      
      if (isGeoError || isManagerIdError) {
        console.warn('[API POST /time-change-requests] Schema mismatch detected, creating without relations. Error:', errorMsg.substring(0, 200))
        
        // Create without include to avoid schema validation issues
        changeRequest = await prisma.timeChangeRequest.create({
          data: {
            timesheetId: validatedData.timesheetId || null,
            userId: user.id,
            date: dateForDb,
            originalClockInTime: originalClockIn || roundedClockIn,
            originalClockOutTime: originalClockOut,
            requestedClockInTime: roundedClockIn,
            requestedClockOutTime: roundedClockOut,
            reason: validatedData.reason,
            status: 'PENDING'
          }
        })
        
        // Fetch user and timesheet separately using raw SQL to avoid schema issues
        try {
          const userResults = await prisma.$queryRaw(
            Prisma.sql`SELECT id, name, email FROM users WHERE id = ${user.id}`
          ) as any[]
          const userData = userResults?.[0] || null
          
          let timesheetData = null
          if (validatedData.timesheetId) {
            const tsResults = await prisma.$queryRaw(
              Prisma.sql`SELECT id, "userId", date, "clockInTime", "clockOutTime", "totalHours", status FROM timesheets WHERE id = ${validatedData.timesheetId}`
            ) as any[]
            timesheetData = tsResults?.[0] || null
          }
          
          // Manually construct the response object
          changeRequest = {
            ...changeRequest,
            user: userData ? {
              id: userData.id,
              name: userData.name,
              email: userData.email
            } : null,
            timesheet: timesheetData
          }
        } catch (fetchError) {
          console.warn('[API POST /time-change-requests] Could not fetch relations, returning basic change request:', fetchError)
          // Return change request without relations if fetch fails
        }
      } else {
        // Log the actual error before re-throwing
        console.error('[API POST /time-change-requests] Error creating change request:', {
          message: errorMsg,
          code: dbError?.code,
          name: dbError?.name,
          stack: dbError?.stack?.substring(0, 500)
        })
        throw dbError
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Change request submitted successfully. Waiting for admin approval.',
      changeRequest
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating change request:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    // Check if it's a geolocation-related error that we might have missed
    // Be more specific - only catch actual geolocation column errors
    const errorMsg = String(error?.message || error?.code || '')
    const isGeoError = errorMsg.includes('geoLat') || 
                      errorMsg.includes('geoLon') ||
                      errorMsg.includes('geoAccuracy') ||
                      errorMsg.includes('locationDenied') ||
                      errorMsg.includes('clockOutGeoLat') ||
                      errorMsg.includes('clockOutGeoLon') ||
                      (errorMsg.includes('does not exist') && (
                        errorMsg.includes('geo') || 
                        errorMsg.includes('location')
                      ))
    
    if (isGeoError) {
      console.error('[API POST /time-change-requests] Unhandled geolocation error:', errorMsg.substring(0, 300))
      return NextResponse.json(
        { 
          success: false,
          error: 'Database schema mismatch. Please contact support.',
          details: 'Geolocation columns are missing from the database.'
        },
        { status: 500 }
      )
    }
    
    // Log the actual error for debugging
    console.error('[API POST /time-change-requests] Actual error:', {
      message: errorMsg,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500)
    })
    
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET /api/time-change-requests - List change requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    
    // Non-admins can only see their own change requests
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }

    const changeRequests = await prisma.timeChangeRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        timesheet: {
          select: {
            id: true,
            userId: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
            totalHours: true,
            status: true
            // Explicitly exclude geolocation and managerId fields
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json(changeRequests)
  } catch (error) {
    console.error('Error fetching change requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
