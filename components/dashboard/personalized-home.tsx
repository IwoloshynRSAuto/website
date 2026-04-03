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
  CheckSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    assignedTasks?: Array<{
      id: string
      name: string
      description: string | null
      status: string
      dueDate: string | null
      taskCode: string | null
      taskCodeDescription: string | null
      job: {
        id: string
        jobNumber: string
        title: string
      } | null
      quote: {
        id: string
        quoteNumber: string
        title: string
      } | null
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
  assignedTasks?: Array<{
    id: string
    name: string
    description: string | null
    status: string
    dueDate: string | null
    taskCode: string | null
    taskCodeDescription: string | null
    job: {
      id: string
      jobNumber: string
      title: string
    } | null
    quote: {
      id: string
      quoteNumber: string
      title: string
    } | null
  }>
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
  assignedTasks = dashboardData.assignedTasks || [],
}: PersonalizedHomeProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isClocking, setIsClocking] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [taskSortBy, setTaskSortBy] = useState<'dueDate' | 'status' | 'name'>('dueDate')
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClockInOut = async () => {
    try {
      setIsClocking(true)
      const now = new Date()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)

      if (todayAttendance && !todayAttendance.clockOutTime) {
        const response = await fetch(`/api/timesheets/${todayAttendance.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockOutTime: now.toISOString(),
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
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            date: today.toISOString(),
            clockInTime: now.toISOString(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to clock in')
        }
        
        const responseData = await response.json()
        
        // Extract timesheet ID - MUST use response.data?.id ?? response.id
        const timesheetId = responseData.data?.id ?? responseData.id
        console.log('[Clock In] Response data:', responseData)
        console.log('[Clock In] Extracted timesheet ID:', timesheetId)
        
        if (!timesheetId) {
          console.error('[Clock In] ❌❌❌ CRITICAL: No timesheet ID found!')
          console.error('[Clock In] Response structure:', JSON.stringify(responseData, null, 2))
          throw new Error('Failed to get timesheet ID from response')
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

          {/* Assigned Tasks */}
          {assignedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Assigned Tasks</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={taskSortBy}
                      onValueChange={(value: 'dueDate' | 'status' | 'name') => setTaskSortBy(value)}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dueDate">Sort by Due Date</SelectItem>
                        <SelectItem value="status">Sort by Status</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTaskSortOrder(taskSortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-8 w-8 p-0"
                    >
                      {taskSortOrder === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Link href="/dashboard/tasks">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignedTasks
                    .slice()
                    .sort((a, b) => {
                      let comparison = 0
                      if (taskSortBy === 'dueDate') {
                        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
                        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
                        comparison = aDate - bDate
                      } else if (taskSortBy === 'status') {
                        const statusOrder = { 'COMPLETED': 4, 'IN_PROGRESS': 3, 'WAITING': 2, 'BACKLOG': 1 }
                        comparison = (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
                                    (statusOrder[b.status as keyof typeof statusOrder] || 0)
                      } else if (taskSortBy === 'name') {
                        comparison = a.name.localeCompare(b.name)
                      }
                      return taskSortOrder === 'asc' ? comparison : -comparison
                    })
                    .slice(0, 10)
                    .map((task) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'COMPLETED':
                          return 'bg-green-100 text-green-800'
                        case 'IN_PROGRESS':
                          return 'bg-blue-100 text-blue-800'
                        case 'WAITING':
                          return 'bg-yellow-100 text-yellow-800'
                        default:
                          return 'bg-gray-100 text-gray-800'
                      }
                    }

                    const getStatusLabel = (status: string) => {
                      switch (status) {
                        case 'BACKLOG':
                          return 'Backlog'
                        case 'IN_PROGRESS':
                          return 'In Progress'
                        case 'WAITING':
                          return 'Waiting'
                        case 'COMPLETED':
                          return 'Completed'
                        default:
                          return status
                      }
                    }

                    const taskLink = task.job 
                      ? `/dashboard/jobs/${task.job.id}`
                      : task.quote
                      ? `/dashboard/parts/quotes/${task.quote.id}`
                      : null

                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                    const isDueSoon = task.dueDate && !isOverdue && new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && task.status !== 'COMPLETED'

                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                          isOverdue 
                            ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                            : isDueSoon
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                      >
                        <div className="mt-0.5">
                          <CheckSquare className={`h-5 w-5 ${
                            task.status === 'COMPLETED' 
                              ? 'text-green-600' 
                              : isOverdue 
                              ? 'text-red-600' 
                              : isDueSoon
                              ? 'text-orange-600'
                              : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 mb-1">{task.name}</h4>
                              {task.description && (
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                              )}
                            </div>
                            <Badge className={`${getStatusColor(task.status)} shrink-0`} variant="outline">
                              {getStatusLabel(task.status)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {task.dueDate && (
                              <div className={`flex items-center gap-1 ${
                                isOverdue 
                                  ? 'text-red-700 font-semibold' 
                                  : isDueSoon
                                  ? 'text-orange-700 font-medium'
                                  : 'text-gray-600'
                              }`}>
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {isOverdue ? 'Overdue: ' : 'Due: '}
                                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}
                            {task.job && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Briefcase className="h-3 w-3" />
                                <span className="font-medium">{task.job.jobNumber}</span>
                              </div>
                            )}
                            {task.quote && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <FileText className="h-3 w-3" />
                                <span className="font-medium">{task.quote.quoteNumber}</span>
                              </div>
                            )}
                            {task.taskCode && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <span className="font-mono text-xs">{task.taskCode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {taskLink && (
                          <Link href={taskLink} className="mt-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
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
