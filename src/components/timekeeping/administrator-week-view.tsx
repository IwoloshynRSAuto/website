'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimeEntry {
  id: string
  date: string
  regularHours: number
  overtimeHours: number
  notes: string | null
  billable: boolean
  rate: number | null
  job: {
    id: string
    jobNumber: string
    title: string
  }
  laborCode: {
    id: string
    code: string
    description: string
    hourlyRate: number
  } | null
}

interface TimesheetSubmission {
  id: string
  weekStart: string
  weekEnd: string
  status: string
  submittedAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
  timeEntries: TimeEntry[]
}

interface AdministratorWeekViewProps {
  submissions: TimesheetSubmission[]
}

export function AdministratorWeekView({ submissions }: AdministratorWeekViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  
  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(selectedWeek, { weekStartsOn: 0 }), [selectedWeek])
  const weekEnd = useMemo(() => endOfWeek(selectedWeek, { weekStartsOn: 0 }), [selectedWeek])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  // Filter submissions for selected week
  const weekSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const submissionStart = new Date(submission.weekStart)
      const submissionEnd = new Date(submission.weekEnd)
      return submissionStart.getTime() === weekStart.getTime() && 
             submissionEnd.getTime() === weekEnd.getTime()
    })
  }, [submissions, weekStart, weekEnd])

  // Group time entries by employee and job/labor code
  const employeeSummary = useMemo(() => {
    const summary: Record<string, {
      user: { id: string; name: string; email: string }
      jobs: Record<string, {
        job: { id: string; jobNumber: string; title: string }
        laborCodes: Record<string, {
          laborCode: { id: string; code: string; description: string; hourlyRate: number } | null
          entries: TimeEntry[]
          totalRegularHours: number
          totalOvertimeHours: number
          totalHours: number
          totalValue: number
        }>
        totalRegularHours: number
        totalOvertimeHours: number
        totalHours: number
        totalValue: number
      }>
      totalRegularHours: number
      totalOvertimeHours: number
      totalHours: number
      totalValue: number
    }> = {}

    weekSubmissions.forEach(submission => {
      const userId = submission.user.id
      
      if (!summary[userId]) {
        summary[userId] = {
          user: submission.user,
          jobs: {},
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalHours: 0,
          totalValue: 0
        }
      }

      submission.timeEntries.forEach(entry => {
        const jobId = entry.job.id
        const laborCodeId = entry.laborCode?.id || 'no-code'
        
        // Initialize job if not exists
        if (!summary[userId].jobs[jobId]) {
          summary[userId].jobs[jobId] = {
            job: entry.job,
            laborCodes: {},
            totalRegularHours: 0,
            totalOvertimeHours: 0,
            totalHours: 0,
            totalValue: 0
          }
        }

        // Initialize labor code if not exists
        if (!summary[userId].jobs[jobId].laborCodes[laborCodeId]) {
          summary[userId].jobs[jobId].laborCodes[laborCodeId] = {
            laborCode: entry.laborCode,
            entries: [],
            totalRegularHours: 0,
            totalOvertimeHours: 0,
            totalHours: 0,
            totalValue: 0
          }
        }

        // Add entry
        summary[userId].jobs[jobId].laborCodes[laborCodeId].entries.push(entry)
        summary[userId].jobs[jobId].laborCodes[laborCodeId].totalRegularHours += entry.regularHours
        summary[userId].jobs[jobId].laborCodes[laborCodeId].totalOvertimeHours += entry.overtimeHours
        summary[userId].jobs[jobId].laborCodes[laborCodeId].totalHours += entry.regularHours + entry.overtimeHours
        
        const entryValue = (entry.regularHours + entry.overtimeHours) * (entry.rate || 0)
        summary[userId].jobs[jobId].laborCodes[laborCodeId].totalValue += entryValue

        // Update job totals
        summary[userId].jobs[jobId].totalRegularHours += entry.regularHours
        summary[userId].jobs[jobId].totalOvertimeHours += entry.overtimeHours
        summary[userId].jobs[jobId].totalHours += entry.regularHours + entry.overtimeHours
        summary[userId].jobs[jobId].totalValue += entryValue

        // Update employee totals
        summary[userId].totalRegularHours += entry.regularHours
        summary[userId].totalOvertimeHours += entry.overtimeHours
        summary[userId].totalHours += entry.regularHours + entry.overtimeHours
        summary[userId].totalValue += entryValue
      })
    })

    return summary
  }, [weekSubmissions])

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(subWeeks(selectedWeek, 1))
    } else {
      setSelectedWeek(addWeeks(selectedWeek, 1))
    }
  }

  const exportToCSV = () => {
    const csvData = []
    
    // Add header
    csvData.push([
      'Employee',
      'Email',
      'Job Number',
      'Job Title',
      'Labor Code',
      'Labor Code Description',
      'Regular Hours',
      'Overtime Hours',
      'Total Hours'
    ])

    // Add data rows
    Object.values(employeeSummary).forEach(employee => {
      Object.values(employee.jobs).forEach(job => {
        Object.values(job.laborCodes).forEach(laborCode => {
          csvData.push([
            employee.user?.name || '[Deleted User]',
            employee.user?.email || 'N/A',
            job.job.jobNumber,
            job.job.title,
            laborCode.laborCode?.code || 'No Code',
            laborCode.laborCode?.description || 'No Description',
            laborCode.totalRegularHours.toFixed(2),
            laborCode.totalOvertimeHours.toFixed(2),
            laborCode.totalHours.toFixed(2)
          ])
        })
      })
    })

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    // Download file
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-summary-${format(weekStart, 'yyyy-MM-dd')}-to-${format(weekEnd, 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const totalEmployees = Object.keys(employeeSummary).length
  const totalHours = Object.values(employeeSummary).reduce((sum, emp) => sum + emp.totalHours, 0)

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Week Summary</span>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <div className="text-center min-w-[180px]">
                  <div className="font-medium text-sm">
                    {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">
                    Week of {format(weekStart, 'MMMM dd, yyyy')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <Button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                disabled={totalEmployees === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Week Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 rounded p-2 border border-blue-200">
              <div className="text-lg font-bold text-blue-600">{totalEmployees}</div>
              <div className="text-xs text-blue-700">Employees</div>
            </div>
            <div className="bg-green-50 rounded p-2 border border-green-200">
              <div className="text-lg font-bold text-green-600">{totalHours.toFixed(1)}h</div>
              <div className="text-xs text-green-700">Total Hours</div>
            </div>
          </div>

          {totalEmployees === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No timesheet data for this week</p>
              <p className="text-sm">Select a different week or check if timesheets have been submitted.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.values(employeeSummary).map((employee) => (
                <div key={employee.user.id} className="bg-white border border-gray-200 rounded">
                  {/* Employee Header */}
                  <div className="bg-blue-50 px-3 py-1.5 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold text-sm text-gray-900">{employee.user?.name || '[Deleted User]'}</div>
                        <div className="text-xs text-gray-500">{employee.user?.email || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm text-gray-900">{employee.totalHours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">
                          {employee.totalRegularHours.toFixed(1)}r + {employee.totalOvertimeHours.toFixed(1)}o
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Jobs and Labor Codes */}
                  <div className="p-0">
                    {Object.values(employee.jobs).map((job) => (
                      <div key={job.job.id} className="border-b border-gray-100 last:border-b-0">
                        {/* Job Header */}
                        <div className="bg-gray-50 px-3 py-1 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-sm text-gray-900">{job.job.jobNumber}</div>
                              <div className="text-xs text-gray-600">{job.job.title}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-sm text-gray-900">{job.totalHours.toFixed(1)}h</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Labor Codes Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium text-gray-700">Labor Code</th>
                                <th className="px-2 py-1 text-left font-medium text-gray-700">Description</th>
                                <th className="px-2 py-1 text-center font-medium text-gray-700">Regular</th>
                                <th className="px-2 py-1 text-center font-medium text-gray-700">Overtime</th>
                                <th className="px-2 py-1 text-center font-medium text-gray-700">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(job.laborCodes).map((laborCode, index) => (
                                <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                  <td className="px-2 py-1 font-medium text-gray-900">
                                    {laborCode.laborCode?.code || 'No Code'}
                                  </td>
                                  <td className="px-2 py-1 text-gray-600">
                                    {laborCode.laborCode?.description || 'No Description'}
                                  </td>
                                  <td className="px-2 py-1 text-center text-gray-900">
                                    {laborCode.totalRegularHours.toFixed(1)}h
                                  </td>
                                  <td className="px-2 py-1 text-center text-gray-900">
                                    {laborCode.totalOvertimeHours.toFixed(1)}h
                                  </td>
                                  <td className="px-2 py-1 text-center font-medium text-gray-900">
                                    {laborCode.totalHours.toFixed(1)}h
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
