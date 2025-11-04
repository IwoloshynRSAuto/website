'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Job {
  id: string
  jobNumber: string
  title: string
  endDate: Date | null
  status: string
  priority: string
  updatedAt: Date
  assignedTo: {
    name: string | null
  } | null
  customer: {
    name: string
  } | null
}

interface UpcomingDueDatesProps {
  jobs: Job[]
}

export function UpcomingDueDates({ jobs }: UpcomingDueDatesProps) {
  const router = useRouter()
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])

  useEffect(() => {
    // Filter active jobs and sort by most recently updated
    const recentJobs = jobs
      .filter(job => job.status !== 'COMPLETED' && job.status !== 'CANCELLED')
      .sort((a, b) => {
        // Sort by updatedAt in descending order (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 1) // Show only the most recently updated job

    setUpcomingJobs(recentJobs)
  }, [jobs])

  const getDueDateStatus = (endDate: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDate = new Date(endDate)
    const daysUntilDue = differenceInDays(dueDate, today)

    if (daysUntilDue < 0) {
      return { status: 'overdue', color: 'destructive', icon: AlertTriangle }
    } else if (daysUntilDue === 0) {
      return { status: 'due-today', color: 'destructive', icon: AlertTriangle }
    } else if (daysUntilDue <= 3) {
      return { status: 'due-soon', color: 'secondary', icon: Clock }
    } else {
      return { status: 'upcoming', color: 'default', icon: Calendar }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'destructive'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default'
      case 'ACTIVE':
        return 'secondary'
      case 'PLANNING':
        return 'outline'
      default:
        return 'default'
    }
  }

  if (upcomingJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recently Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No recent activity</p>
            <p className="text-sm text-gray-500">No active projects to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recently Updated
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingJobs.map((job) => {
            const dueDateStatus = job.endDate ? getDueDateStatus(job.endDate) : null
            const daysUntilDue = job.endDate ? differenceInDays(new Date(job.endDate), new Date()) : 0
            
            return (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm truncate">
                      {job.jobNumber} - {job.title}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={getPriorityColor(job.priority)} className="text-xs">
                        {job.priority}
                      </Badge>
                      <Badge variant={getStatusColor(job.status)} className="text-xs">
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-600">
                    {job.assignedTo?.name && (
                      <span className="truncate">Assigned to: {job.assignedTo.name}</span>
                    )}
                    {job.customer?.name && (
                      <span className="truncate">Customer: {job.customer.name}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">
                        Last updated {format(new Date(job.updatedAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {job.endDate && (
                      <span className="text-xs text-gray-500">
                        Due: {format(new Date(job.endDate), 'MMM dd, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                  className="mt-2 sm:mt-0 sm:ml-2 self-start sm:self-center"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={() => router.push('/dashboard/jobs')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 ease-in-out"
            size="sm"
          >
            View All Jobs
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
