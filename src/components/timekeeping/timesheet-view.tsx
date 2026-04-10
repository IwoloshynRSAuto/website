'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks,
  isSameDay 
} from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Plus, X, Check, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string
  billable: boolean
  rate: number | null
  user: {
    id: string
    name: string
    email: string
  }
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

interface TimesheetRow {
  id: string
  description: string
  jobNumber: string
  dailyHours: Record<string, number>
  totalHours: number
}

interface TimesheetViewProps {
  timeEntries: TimeEntry[]
}

export function TimesheetView({ timeEntries }: TimesheetViewProps) {
  const { toast } = useToast()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [selectedJob, setSelectedJob] = useState('ALL')
  const [timesheetRows, setTimesheetRows] = useState<TimesheetRow[]>([])

  const uniqueUsers = Array.from(new Set(timeEntries.map(entry => entry.user.name))).sort()
  const uniqueJobs = Array.from(new Set(timeEntries.map(entry => entry.job.jobNumber))).sort()

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]) // Sunday
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]) // Saturday
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  // Filter time entries for the current week and selected filters
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.date)
      const matchesWeek = entryDate >= weekStart && entryDate <= weekEnd
      const matchesUser = selectedUser === 'ALL' || entry.user.name === selectedUser
      const matchesJob = selectedJob === 'ALL' || entry.job.jobNumber === selectedJob
      
      return matchesWeek && matchesUser && matchesJob
    })
  }, [timeEntries, weekStart, weekEnd, selectedUser, selectedJob])

  // Convert time entries to timesheet rows
  const processedRows = useMemo(() => {
    const rows: TimesheetRow[] = []
    const groupedEntries: Record<string, TimeEntry[]> = {}

    // Group entries by job and description
    filteredEntries.forEach(entry => {
      const key = `${entry.job.jobNumber}-${entry.description}`
      if (!groupedEntries[key]) {
        groupedEntries[key] = []
      }
      groupedEntries[key].push(entry)
    })

    // Create rows from grouped entries
    Object.entries(groupedEntries).forEach(([key, entries]) => {
      const dailyHours: Record<string, number> = {}
      let totalHours = 0

      weekDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayEntries = entries.filter(entry => 
          format(new Date(entry.date), 'yyyy-MM-dd') === dayStr
        )
        const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
        dailyHours[dayStr] = dayTotal
        totalHours += dayTotal
      })

      if (entries.length > 0) {
        rows.push({
          id: key,
          description: `${entries[0].job.title} (${entries[0].job.jobNumber}) ${entries[0].description}`,
          jobNumber: entries[0].job.jobNumber,
          dailyHours,
          totalHours
        })
      }
    })

    return rows
  }, [filteredEntries, weekDays])

  // Update timesheet rows when processed rows change
  useEffect(() => {
    setTimesheetRows(processedRows)
  }, [processedRows])

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1))
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1))
    }
  }

  const formatTime = (hours: number): string => {
    if (hours === 0) return '0'
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) return `${wholeHours}:00`
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`
  }

  const parseTime = (timeStr: string): number => {
    if (!timeStr || timeStr === '0') return 0
    const parts = timeStr.split(':')
    if (parts.length === 1) {
      return parseFloat(parts[0]) || 0
    }
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    return hours + (minutes / 60)
  }

  const updateRowHours = (rowId: string, dayStr: string, hours: number) => {
    setTimesheetRows(prev => {
      const newRows = prev.map(row => {
        if (row.id === rowId) {
          const newDailyHours = { ...row.dailyHours, [dayStr]: hours }
          const newTotalHours = Object.values(newDailyHours).reduce((sum, h) => sum + h, 0)
          return {
            ...row,
            dailyHours: newDailyHours,
            totalHours: newTotalHours
          }
        }
        return row
      })
      return newRows
    })
  }

  const addNewRow = () => {
    const newRow: TimesheetRow = {
      id: `new-${Date.now()}`,
      description: 'New Project (New Client) Task',
      jobNumber: 'NEW-001',
      dailyHours: {},
      totalHours: 0
    }
    setTimesheetRows(prev => [...prev, newRow])
  }

  const removeRow = (rowId: string) => {
    setTimesheetRows(prev => prev.filter(row => row.id !== rowId))
  }


  const submitTimesheet = () => {
    // Here you would implement the submit logic
    toast({ title: 'Timesheet submitted for approval' })
  }

  const exportTimesheet = () => {
    // Here you would implement the export logic
    toast({ title: 'Timesheet exported successfully' })
  }

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    weekDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      totals[dayStr] = timesheetRows.reduce((sum, row) => sum + (row.dailyHours[dayStr] || 0), 0)
    })
    return totals
  }, [timesheetRows, weekDays])

  const weeklyTotal = Object.values(dailyTotals).reduce((sum, hours) => sum + hours, 0)

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-lg font-medium">
            This week: {format(weekStart, 'dd')} - {format(weekEnd, 'dd MMM yyyy')}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Day
          </Button>
          <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600">
            Week
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="user-filter">User:</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Users</SelectItem>
              {uniqueUsers.map(user => (
                <SelectItem key={user} value={user}>{user}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="job-filter">Job:</Label>
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Jobs</SelectItem>
              {uniqueJobs.map(job => (
                <SelectItem key={job} value={job}>{job}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timesheet Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header Row */}
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-900 min-w-[300px]">
                    Description
                  </th>
                  {weekDays.map((day, index) => (
                    <th 
                      key={day.toISOString()} 
                      className={`text-center p-4 font-medium text-gray-900 min-w-[120px] ${
                        index === 2 ? 'bg-orange-100' : ''
                      }`}
                    >
                      {format(day, 'EEE dd MMM')}
                    </th>
                  ))}
                  <th className="text-center p-4 font-medium text-gray-900 min-w-[100px]">
                    Total
                  </th>
                  <th className="text-center p-4 font-medium text-gray-900 min-w-[50px]">
                    Action
                  </th>
                </tr>
              </thead>
              
              {/* Data Rows */}
              <tbody>
                {timesheetRows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">
                      {row.description}
                    </td>
                    {weekDays.map((day, index) => {
                      const dayStr = format(day, 'yyyy-MM-dd')
                      const hours = row.dailyHours[dayStr] || 0
                      return (
                        <td 
                          key={dayStr} 
                          className={`text-center p-2 ${index === 2 ? 'bg-orange-50' : ''}`}
                        >
                          <div className="flex items-center justify-center">
                            <Input
                              type="text"
                              value={formatTime(hours)}
                              onChange={(e) => {
                                const newHours = parseTime(e.target.value)
                                updateRowHours(row.id, dayStr, newHours)
                              }}
                              className="w-20 text-center text-sm"
                              placeholder="0:00"
                            />
                            {hours > 0 && (
                              <Clock className="h-3 w-3 ml-1 text-gray-400" />
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="text-center p-4 font-medium text-gray-900">
                      {formatTime(row.totalHours)}
                    </td>
                    <td className="text-center p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Totals Row */}
              <tfoot>
                <tr className="border-t-2 bg-gray-100">
                  <td className="p-4 font-semibold text-gray-900">
                    Daily Totals
                  </td>
                  {weekDays.map((day, index) => {
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const total = dailyTotals[dayStr] || 0
                    return (
                      <td 
                        key={dayStr} 
                        className={`text-center p-4 font-semibold text-gray-900 ${
                          index === 2 ? 'bg-orange-100' : ''
                        }`}
                      >
                        {formatTime(total)}
                      </td>
                    )
                  })}
                  <td className="text-center p-4 font-bold text-gray-900 text-lg">
                    {formatTime(weeklyTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={addNewRow} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add row
          </Button>
          
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={exportTimesheet} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button onClick={submitTimesheet} className="bg-orange-500 hover:bg-orange-600">
            <Check className="h-4 w-4 mr-2" />
            Submit week for approval
          </Button>
        </div>
      </div>
    </div>
  )
}