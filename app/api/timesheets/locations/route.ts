import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/timesheets/locations
 * Get all attendance clock-in/out locations (admin/manager only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can access
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    // Build where clause - start simple, filter geolocation in memory if needed
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    // Query timesheets - handle missing geolocation columns gracefully
    let timesheets
    try {
      timesheets = await prisma.timesheet.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          clockInTime: 'desc',
        },
        take: 1000, // Limit to prevent huge responses
      })
    } catch (dbError: any) {
      // If geolocation columns don't exist, use select to exclude them
      const errorMsg = String(dbError?.message || dbError?.code || '')
      const isGeoError = errorMsg.includes('geoLat') || 
                        errorMsg.includes('geo') || 
                        errorMsg.includes('location') ||
                        errorMsg.includes('does not exist')
      
      if (isGeoError) {
        console.warn('[API GET /timesheets/locations] Geolocation columns not found, querying without them')
        // Use select to explicitly include geolocation fields
        timesheets = await prisma.timesheet.findMany({
          where,
          select: {
            id: true,
            userId: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
            geoLat: true,
            geoLon: true,
            geoAccuracy: true,
            locationDenied: true,
            clockOutGeoLat: true,
            clockOutGeoLon: true,
            clockOutGeoAccuracy: true,
            clockOutLocationDenied: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            clockInTime: 'desc',
          },
          take: 1000,
        })
        // Filter in memory for entries with geolocation data
        timesheets = timesheets.filter((ts: any) => 
          (ts.geoLat !== null && ts.geoLon !== null) ||
          (ts.clockOutGeoLat !== null && ts.clockOutGeoLon !== null)
        )
      } else {
        throw dbError
      }
    }

    // Format response with clock-in and clock-out locations
    const locations = timesheets.flatMap((timesheet) => {
      const result: any[] = []

      // Clock-in location - check if geolocation fields exist and have values
      const ts = timesheet as any
      if (ts.geoLat !== null && ts.geoLat !== undefined && 
          ts.geoLon !== null && ts.geoLon !== undefined) {
        result.push({
          id: `${timesheet.id}-in`,
          timesheetId: timesheet.id,
          userId: timesheet.userId,
          userName: timesheet.user.name || timesheet.user.email,
          userEmail: timesheet.user.email,
          type: 'Clock In',
          date: timesheet.date.toISOString(),
          time: timesheet.clockInTime.toISOString(),
          lat: ts.geoLat,
          lon: ts.geoLon,
          accuracy: ts.geoAccuracy || null,
          locationDenied: ts.locationDenied || false,
        })
      }

      // Clock-out location - check if geolocation fields exist and have values
      if (timesheet.clockOutTime) {
        if (ts.clockOutGeoLat !== null && ts.clockOutGeoLat !== undefined && 
            ts.clockOutGeoLon !== null && ts.clockOutGeoLon !== undefined) {
          result.push({
            id: `${timesheet.id}-out`,
            timesheetId: timesheet.id,
            userId: timesheet.userId,
            userName: timesheet.user.name || timesheet.user.email,
            userEmail: timesheet.user.email,
            type: 'Clock Out',
            date: timesheet.date.toISOString(),
            time: timesheet.clockOutTime.toISOString(),
            lat: ts.clockOutGeoLat,
            lon: ts.clockOutGeoLon,
            accuracy: ts.clockOutGeoAccuracy || null,
            locationDenied: ts.clockOutLocationDenied || false,
          })
        }
      }

      return result
    })

    return NextResponse.json({
      success: true,
      data: locations,
      total: locations.length,
    })
  } catch (error: any) {
    console.error('Error fetching attendance locations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch attendance locations',
      },
      { status: 500 }
    )
  }
}

