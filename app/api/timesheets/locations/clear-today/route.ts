import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/timesheets/locations/clear-today
 * Clear all geolocation data for today's attendance clock-ins (admin/manager only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can access
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    console.log('[API DELETE /timesheets/locations/clear-today] Clearing geolocations for:', today.toISOString())

    // Update all timesheets from today to clear geolocation data
    const result = await prisma.timesheet.updateMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      data: {
        geoLat: null,
        geoLon: null,
        geoAccuracy: null,
        locationDenied: false,
        clockOutGeoLat: null,
        clockOutGeoLon: null,
        clockOutGeoAccuracy: null,
        clockOutLocationDenied: false,
      },
    })

    console.log('[API DELETE /timesheets/locations/clear-today] Cleared geolocations for', result.count, 'timesheets')

    return NextResponse.json({
      success: true,
      message: `Cleared geolocation data for ${result.count} timesheet(s)`,
      count: result.count,
    })
  } catch (error: any) {
    console.error('Error clearing today\'s geolocations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear geolocation data',
      },
      { status: 500 }
    )
  }
}


