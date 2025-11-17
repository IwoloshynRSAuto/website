'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  Briefcase, 
  MapPin, 
  TrendingUp, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface EmployeeDashboardProps {
  data: {
    assignedJobs: Array<{
      id: string
      jobNumber: string
      title: string
      customerName: string
      status: string
      priority: string
      endDate: string | null
      nextMilestone: {
        name: string
        scheduledStartDate: string | null
        status: string
      } | null
    }>
    timeOffRequests: Array<{
      id: string
      startDate: string
      endDate: string
      requestType: string
      status: string
      hours: number | null
      reason: string | null
    }>
    serviceReports: Array<{
      id: string
      reportDate: string
      serviceType: string
      description: string
      jobNumber: string
      jobTitle: string
      customerName: string
      hoursWorked: number | null
    }>
    recentTimeEntries: Array<{
      id: string
      date: string
      regularHours: number
      overtimeHours: number
      jobNumber: string
      jobTitle: string
      laborCode: { code: string; name: string } | null
    }>
    recentAttendance: Array<{
      id: string
      date: string
      clockInTime: string
      clockOutTime: string | null
      totalHours: number | null
      status: string
    }>
    pendingExpenses: Array<{
      id: string
      reportDate: string
      description: string
      amount: number
      category: string
      status: string
    }>
    stats: {
      thisWeekHours: number
      thisMonthHours: number
      assignedJobsCount: number
      pendingPTORequests: number
      pendingExpensesCount: number
    }
  }
}

export function EmployeeDashboard({ data }: EmployeeDashboardProps) {
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
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week Hours</p>
                <p className="text-2xl font-bold text-gray-900">{data.stats.thisWeekHours.toFixed(1)}</p>
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
                <p className="text-2xl font-bold text-gray-900">{data.stats.thisMonthHours.toFixed(1)}</p>
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
                <p className="text-2xl font-bold text-gray-900">{data.stats.assignedJobsCount}</p>
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
                  {data.stats.pendingPTORequests + data.stats.pendingExpensesCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Jobs (Tasks) */}
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
            {data.assignedJobs.length === 0 ? (
              <p className="text-sm text-gray-500">No assigned jobs</p>
            ) : (
              <div className="space-y-3">
                {data.assignedJobs.slice(0, 5).map((job) => (
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
              <Link href="/dashboard/timekeeping">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Request
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.timeOffRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No time off requests</p>
            ) : (
              <div className="space-y-3">
                {data.timeOffRequests.slice(0, 5).map((req) => (
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

        {/* Service Reports (Site Visits) */}
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
            {data.serviceReports.length === 0 ? (
              <p className="text-sm text-gray-500">No service reports</p>
            ) : (
              <div className="space-y-3">
                {data.serviceReports.slice(0, 5).map((report) => (
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTimeEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No recent time entries</p>
            ) : (
              <div className="space-y-2">
                {data.recentTimeEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.jobNumber} - {entry.jobTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(entry.date), 'MMM d')}
                        {entry.laborCode && ` • ${entry.laborCode.code}`}
                      </p>
                    </div>
                    <div className="text-right">
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
      {data.pendingExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Expense Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.pendingExpenses.map((exp) => (
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


