'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  ArrowRight,
  LogIn,
  LogOut,
  FileText,
  Edit,
  Briefcase,
  Bell,
  BookOpen,
  Megaphone,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface PersonalizedHomeProps {
  userId: string
  userName: string
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
  dashboardData: {
    stats: {
      thisWeekHours: number
      thisMonthHours: number
      assignedJobsCount: number
      pendingPTORequests: number
      pendingExpensesCount: number
    }
    assignedJobs: Array<{
      id: string
      jobNumber: string
      title: string
      customerName: string
      status: string
      priority: string
      nextMilestone: any
    }>
    recentTimeEntries: Array<{
      id: string
      jobNumber: string
      jobTitle: string
      date: string
      regularHours?: number
      overtimeHours?: number
      laborCode?: { code: string; name: string }
    }>
  }
}

export function PersonalizedHome({
  userId,
  userName,
  todayAttendance,
  todayHours,
  pendingApprovalsCount,
  pendingPTOCount,
  userRole,
  dashboardData,
}: PersonalizedHomeProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isClocking, setIsClocking] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
        // Clock Out - get location
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
        router.refresh()
      } else {
        // Clock In - get location
        const location = await getCurrentLocation()
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            date: today.toISOString(),
            clockInTime: now.toISOString(),
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
        router.refresh()
      }
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

  // Check for missing punches (attendance without clock out from previous days)
  const hasMissingPunches = false // Can be enhanced with actual check

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {userName}!</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Your employee hub</p>
      </div>

      {/* A-PRIORITY SECTION */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          {/* Clock In/Out - Large and Prominent */}
          <Card className="border-2 border-blue-200 bg-blue-50 mb-4">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <Badge variant={isClockedIn ? 'default' : 'secondary'} className="text-sm">
                      {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </h3>
                  {todayAttendance && mounted && (
                    <p className="text-sm text-gray-600">
                      {isClockedIn
                        ? `In: ${format(new Date(todayAttendance.clockInTime), 'h:mm a')}`
                        : `Last: ${format(new Date(todayAttendance.clockOutTime || todayAttendance.clockInTime), 'h:mm a')}`}
                    </p>
                  )}
                  {todayAttendance && !mounted && (
                    <p className="text-sm text-gray-600">Loading...</p>
                  )}
                </div>
                <Button
                  onClick={handleClockInOut}
                  disabled={isClocking}
                  size="lg"
                  className="w-full sm:w-auto min-w-[200px] text-lg py-6"
                  variant={isClockedIn ? 'outline' : 'default'}
                >
                  {isClocking ? (
                    'Processing...'
                  ) : isClockedIn ? (
                    <>
                      <LogOut className="h-5 w-5 mr-2" />
                      Clock Out
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Link href="/dashboard/employee/requests?type=pto">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Submit PTO Request</h3>
                      <p className="text-sm text-gray-600">Request time off</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/employee/requests?type=expense">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Submit Expense Report</h3>
                      <p className="text-sm text-gray-600">Submit expenses for reimbursement</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Link href="/dashboard/timekeeping">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Submit Timesheet for Approval</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/timekeeping/attendance">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Edit className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Edit Today's Attendance</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Critical Alerts */}
          {(hasMissingPunches || pendingPTOCount > 0) && (
            <Card className="border-orange-200 bg-orange-50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-1">Action Required</h3>
                    <ul className="text-sm text-orange-800 space-y-1">
                      {hasMissingPunches && (
                        <li>• Missing clock out punches detected</li>
                      )}
                      {pendingPTOCount > 0 && (
                        <li>• {pendingPTOCount} pending PTO request{pendingPTOCount > 1 ? 's' : ''}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Time Entries</CardTitle>
                <Link href="/dashboard/timekeeping/time">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData.recentTimeEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No time entries yet</p>
                  <Link href="/dashboard/timekeeping/time">
                    <Button variant="outline" size="sm" className="mt-4">
                      Add Time Entry
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recentTimeEntries.slice(0, 5).map((entry) => {
                    const totalHours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{entry.jobTitle}</div>
                          <div className="text-xs text-gray-600">
                            {entry.jobNumber} • {format(new Date(entry.date), 'MMM d, yyyy')}
                            {entry.laborCode && ` • ${entry.laborCode.code}`}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-sm">{totalHours.toFixed(1)}h</div>
                          {entry.overtimeHours && entry.overtimeHours > 0 && (
                            <div className="text-xs text-orange-600">
                              +{entry.overtimeHours.toFixed(1)}h OT
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* C-PRIORITY SECTION */}
      <div className="space-y-6 pt-6 border-t">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h2>
          
          {/* Recently Worked Jobs */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recently Worked Jobs</CardTitle>
                <Link href="/dashboard/jobs">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData.assignedJobs.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No recent jobs
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboardData.assignedJobs.slice(0, 5).map((job) => (
                    <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{job.title}</div>
                          <div className="text-xs text-gray-600">
                            {job.jobNumber} • {job.customerName}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {job.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/timekeeping">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-medium text-sm mb-1">My Schedule</h3>
                  <p className="text-xs text-gray-600">View schedule</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-60">
              <CardContent className="p-4 text-center">
                <Megaphone className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-medium text-sm mb-1">Announcements</h3>
                <p className="text-xs text-gray-600">What's new</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-60">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium text-sm mb-1">Training Docs</h3>
                <p className="text-xs text-gray-600">Resources</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-60">
              <CardContent className="p-4 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-medium text-sm mb-1">Notifications</h3>
                <p className="text-xs text-gray-600">View alerts</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
