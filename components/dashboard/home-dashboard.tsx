'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Clock,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  LogIn,
  LogOut,
  FileText,
  UserCheck,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface HomeDashboardProps {
  userId: string
  todayAttendance: {
    id: string
    date: string
    clockInTime: string
    clockOutTime: string | null
    status: string
  } | null
  todayHours: number
  pendingApprovalsCount: number
  pendingPTOCount: number
  userRole: string
}

export function HomeDashboard({
  userId,
  todayAttendance,
  todayHours,
  pendingApprovalsCount,
  pendingPTOCount,
  userRole,
}: HomeDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isClocking, setIsClocking] = useState(false)

  const getCurrentLocation = (): Promise<{ lat: number; lon: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy || 0,
          })
        },
        () => {
          // User denied or error - don't block, just return null
          resolve(null)
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
        }
      )
    })
  }

  const handleClockInOut = async () => {
    try {
      setIsClocking(true)
      const now = new Date()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)

      if (todayAttendance && !todayAttendance.clockOutTime) {
        // Clock out - get location
        const location = await getCurrentLocation()
        const response = await fetch(`/api/timesheets/${todayAttendance.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockOutTime: now.toISOString(),
            clockOutGeoLat: location?.lat ?? null,
            clockOutGeoLon: location?.lon ?? null,
            clockOutGeoAccuracy: location?.accuracy ?? null,
            // clockOutLocationDenied: !location, // Removed - field doesn't exist in database yet
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to clock out')
        }
        toast({
          title: 'Success',
          description: 'Clocked out successfully',
        })
      } else {
        // Clock in - get location
        const location = await getCurrentLocation()
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: now.toISOString(),
            date: today.toISOString(),
            userId,
            geoLat: location?.lat ?? null,
            geoLon: location?.lon ?? null,
            geoAccuracy: location?.accuracy ?? null,
            // locationDenied: !location, // Removed - field doesn't exist in database
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to clock in')
        }
        toast({
          title: 'Success',
          description: 'Clocked in successfully',
        })
      }

      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in/out',
        variant: 'destructive',
      })
    } finally {
      setIsClocking(false)
    }
  }

  const isClockedIn = todayAttendance && !todayAttendance.clockOutTime

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Home</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Quick access to common actions and your status</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Clock In/Out */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                {isClockedIn ? (
                  <LogOut className="h-6 w-6 text-blue-600" />
                ) : (
                  <LogIn className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <Badge variant={isClockedIn ? 'default' : 'secondary'}>
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </h3>
            {todayAttendance && (
              <p className="text-sm text-gray-600 mb-4">
                {isClockedIn
                  ? `In: ${format(new Date(todayAttendance.clockInTime), 'h:mm a')}`
                  : `Last: ${format(new Date(todayAttendance.clockOutTime || todayAttendance.clockInTime), 'h:mm a')}`}
              </p>
            )}
            <Button
              onClick={handleClockInOut}
              disabled={isClocking}
              className="w-full"
              variant={isClockedIn ? 'outline' : 'default'}
            >
              {isClocking ? 'Processing...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          </CardContent>
        </Card>

        {/* Submit Attendance Change */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Attendance Change</h3>
            <p className="text-sm text-gray-600 mb-4">Request a change to your attendance</p>
            <Link href="/dashboard/timekeeping/attendance">
              <Button variant="outline" className="w-full">
                Request Change
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Submit PTO Request */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              {pendingPTOCount > 0 && (
                <Badge variant="secondary">{pendingPTOCount} Pending</Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Request Time Off</h3>
            <p className="text-sm text-gray-600 mb-4">Submit a PTO request</p>
            <Link href="/dashboard/employee/requests">
              <Button variant="outline" className="w-full">
                Submit Request
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Submit Expense */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Submit Expense</h3>
            <p className="text-sm text-gray-600 mb-4">Submit an expense report</p>
            <Link href="/dashboard/employee/requests">
              <Button variant="outline" className="w-full">
                Submit Expense
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's Hours</p>
                <p className="text-2xl font-bold text-gray-900">{todayHours.toFixed(1)}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {pendingApprovalsCount > 0 && (
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Approvals</p>
                  <p className="text-2xl font-bold text-orange-700">{pendingApprovalsCount}</p>
                </div>
                <UserCheck className="h-8 w-8 text-orange-600" />
              </div>
              <Link href="/dashboard/manager/approvals">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {pendingPTOCount > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending PTO</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingPTOCount}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {isClockedIn ? 'Active' : 'Available'}
                </p>
              </div>
              {isClockedIn ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/employee">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">My Dashboard</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/timekeeping/attendance">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Timesheets</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/jobs">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Jobs</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            {userRole === 'ADMIN' && (
              <Link href="/dashboard/admin">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-slate-600" />
                      <span className="font-medium">Admin</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

