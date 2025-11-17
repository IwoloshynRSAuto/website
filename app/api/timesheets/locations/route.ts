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

    const where: any = {
      // Only include entries with geolocation data
      OR: [
        { geoLat: { not: null } },
        { clockOutGeoLat: { not: null } },
        // locationDenied and clockOutLocationDenied fields may not exist in database
      ],
    }

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    const timesheets = await prisma.timesheet.findMany({
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

    // Format response with clock-in and clock-out locations
    const locations = timesheets.flatMap((timesheet) => {
      const result: any[] = []

      // Clock-in location
      if (timesheet.geoLat !== null && timesheet.geoLon !== null) {
        result.push({
          id: `${timesheet.id}-in`,
          timesheetId: timesheet.id,
          userId: timesheet.userId,
          userName: timesheet.user.name || timesheet.user.email,
          type: 'Clock In',
          date: timesheet.date.toISOString(),
          time: timesheet.clockInTime.toISOString(),
          lat: timesheet.geoLat,
          lon: timesheet.geoLon,
          accuracy: timesheet.geoAccuracy,
          locationDenied: false, // Field may not exist, default to false
        })
      }

      // Clock-out location
      if (timesheet.clockOutTime) {
        if (timesheet.clockOutGeoLat !== null && timesheet.clockOutGeoLon !== null) {
          result.push({
            id: `${timesheet.id}-out`,
            timesheetId: timesheet.id,
            userId: timesheet.userId,
            userName: timesheet.user.name || timesheet.user.email,
            type: 'Clock Out',
            date: timesheet.date.toISOString(),
            time: timesheet.clockOutTime.toISOString(),
            lat: timesheet.clockOutGeoLat,
            lon: timesheet.clockOutGeoLon,
            accuracy: timesheet.clockOutGeoAccuracy,
            locationDenied: false, // Field may not exist, default to false
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

