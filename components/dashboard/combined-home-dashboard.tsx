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
  Briefcase,
  MapPin,
  Plus,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface CombinedHomeDashboardProps {
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
    timeOffRequests: Array<{
      id: string
      requestType: string
      startDate: string
      endDate: string
      status: string
      hours?: number
    }>
    serviceReports: Array<{
      id: string
      serviceType: string
      jobNumber: string
      jobTitle: string
      customerName: string
      reportDate: string
      hoursWorked?: number
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
    recentAttendance: Array<{
      id: string
      date: string
      clockInTime: string
      clockOutTime: string | null
      totalHours?: number
    }>
    pendingExpenses: Array<{
      id: string
      description: string
      category: string
      amount: number
      reportDate: string
      status: string
    }>
  }
}

export function CombinedHomeDashboard({
  userId,
  todayAttendance,
  todayHours,
  pendingApprovalsCount,
  pendingPTOCount,
  userRole,
  dashboardData,
}: CombinedHomeDashboardProps) {
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'PENDING': 'secondary',
      'APPROVED': 'default',
      'REJECTED': 'destructive',
      'DRAFT': 'outline',
      'SUBMITTED': 'secondary',
      'ACTIVE': 'default',
      'COMPLETED': 'default'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-red-100 text-red-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'LOW': 'bg-green-100 text-green-800'
    }
    return (
      <Badge className={colors[priority] || 'bg-gray-100 text-gray-800'}>
        {priority}
      </Badge>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Home</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Quick access to common actions and your dashboard</p>
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

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week Hours</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.thisWeekHours.toFixed(1)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month Hours</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.thisMonthHours.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.assignedJobsCount}</p>
              </div>
              <Briefcase className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.stats.pendingPTORequests + dashboardData.stats.pendingExpensesCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Assigned Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Assigned Jobs
              </CardTitle>
              <Link href="/dashboard/jobs">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.assignedJobs.length === 0 ? (
              <p className="text-sm text-gray-500">No assigned jobs</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.assignedJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <h4 className="font-semibold text-gray-900 hover:text-blue-600">
                            {job.jobNumber} - {job.title}
                          </h4>
                        </Link>
                        <p className="text-sm text-gray-600">{job.customerName}</p>
                        {job.nextMilestone && (
                          <p className="text-xs text-gray-500 mt-1">
                            Next: {job.nextMilestone.name}
                            {job.nextMilestone.scheduledStartDate && (
                              <span className="ml-2">
                                ({format(new Date(job.nextMilestone.scheduledStartDate), 'MMM d')})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getPriorityBadge(job.priority)}
                        {getStatusBadge(job.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PTO Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Off Requests
              </CardTitle>
              <Link href="/dashboard/employee/requests">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Request
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.timeOffRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No time off requests</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.timeOffRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{req.requestType}</p>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                        </p>
                        {req.hours && (
                          <p className="text-xs text-gray-500 mt-1">{req.hours} hours</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Recent Site Visits
              </CardTitle>
              <Link href="/dashboard/jobs">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.serviceReports.length === 0 ? (
              <p className="text-sm text-gray-500">No service reports</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.serviceReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{report.serviceType}</p>
                        <p className="text-sm text-gray-600 mt-1">{report.jobNumber} - {report.jobTitle}</p>
                        <p className="text-xs text-gray-500 mt-1">{report.customerName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(report.reportDate), 'MMM d, yyyy')}
                          {report.hoursWorked && ` • ${report.hoursWorked} hours`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Time Entries
              </CardTitle>
              <Link href="/dashboard/timekeeping/time">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.recentTimeEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No recent time entries</p>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentTimeEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {entry.jobNumber} - {entry.jobTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(entry.date), 'MMM d')}
                        {entry.laborCode && ` • ${entry.laborCode.code}`}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-semibold">
                        {(entry.regularHours || 0) + (entry.overtimeHours || 0)}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Expenses */}
      {dashboardData.pendingExpenses.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Expense Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.pendingExpenses.map((exp) => (
                <div key={exp.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{exp.description}</p>
                        {getStatusBadge(exp.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {exp.category} • ${exp.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(exp.reportDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

