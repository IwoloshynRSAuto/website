'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, FileText } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth, addDays, subDays, startOfDay } from 'date-fns'
import { TimeEntryModal } from './time-entry-modal'
import { DayTimesheetModal } from './day-timesheet-modal'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  name: string | null
  email: string | null
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface LaborCode {
  id: string
  code: string
  name: string
}

interface TimesheetEntry {
  id: string
  userId: string
  date: string
  clockInTime: string
  clockOutTime: string | null
  totalHours: number | null
  status: string
  jobEntries: JobEntry[]
}

interface JobEntry {
  id: string
  jobNumber: string
  laborCode: string
  punchInTime: string
  punchOutTime: string | null
  notes: string | null
}

interface TimesheetDevCalendarProps {
  currentUserId: string
  currentUserName: string
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  isAdmin: boolean
}

type ViewMode = 'day' | 'week' | 'month'

export function TimesheetDevCalendar({
  currentUserId,
  currentUserName,
  users,
  jobs,
  laborCodes,
  isAdmin
}: TimesheetDevCalendarProps) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId)
  const [modalDate, setModalDate] = useState<Date | null>(null)
  // Ref to track the displayed date - updated immediately on navigation
  const displayedDateRef = useRef(currentDate)
  
  // Keep ref in sync with currentDate
  useEffect(() => {
    displayedDateRef.current = currentDate
  }, [currentDate])

  // Load timesheets
  useEffect(() => {
    loadTimesheets()
  }, [selectedUserId, currentDate, viewMode])

  const loadTimesheets = async () => {
    setIsLoading(true)
    try {
      let startDate: Date
      let endDate: Date
      
      if (viewMode === 'day') {
        startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(currentDate)
        endDate.setHours(23, 59, 59, 999)
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 }) // Saturday
      } else {
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      }

      const response = await fetch(
        `/api/timesheets?userId=${selectedUserId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setTimesheets(data)
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load timesheets',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEntry(null) // Make sure no entry is selected
    setIsModalOpen(false) // Close entry modal if open
    setIsDayModalOpen(true) // Open day modal
  }

  const handleEntryClick = (entry: TimesheetEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    setModalDate(startOfDay(new Date(entry.date)))
    setSelectedEntry(entry)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedEntry(null)
    setModalDate(null)
    if (viewMode !== 'day') {
      setSelectedDate(null)
    }
    loadTimesheets()
  }

  const handleDayModalClose = () => {
    setIsDayModalOpen(false)
    // Don't reset selectedDate in day view - keep it synced with currentDate
    if (viewMode !== 'day') {
      setSelectedDate(null)
    }
    loadTimesheets()
  }

  const handleAddEntry = () => {
    setIsDayModalOpen(false)
    // Use selectedDate from DayTimesheetModal if available, otherwise use currentDate
    const dateToUse = selectedDate || currentDate
    const normalizedDate = startOfDay(dateToUse)
    setModalDate(normalizedDate)
    setSelectedEntry(null)
    setIsModalOpen(true)
  }

  // Handler for the main "Add Entry" button - always uses the displayed currentDate in day view
  const handleMainAddEntry = () => {
    // In day view, ALWAYS use the exact same currentDate that's being displayed
    // Read from ref to ensure we get the absolute latest value, even if state hasn't updated yet
    if (viewMode === 'day') {
      // Use the ref which is updated immediately on navigation
      // This is the same value shown in the day view header
      const displayedDate = new Date(displayedDateRef.current)
      const normalizedDate = startOfDay(displayedDate)
      setModalDate(normalizedDate)
      setSelectedEntry(null)
      setIsModalOpen(true)
    } else {
      // In other views, use selectedDate if available, otherwise currentDate
      const dateToUse = selectedDate || displayedDateRef.current
      const normalizedDate = startOfDay(new Date(dateToUse))
      setModalDate(normalizedDate)
      setSelectedEntry(null)
      setIsModalOpen(true)
    }
  }

  const handleEditEntry = (entry: TimesheetEntry) => {
    // Close day modal and open entry modal
    setIsDayModalOpen(false)
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      setModalDate(startOfDay(new Date(entry.date)))
      setSelectedEntry(entry)
      setIsModalOpen(true)
    }, 100)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    // Update currentDate - this is what's displayed in day view
    setCurrentDate(prev => {
      const newDate = direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
      // Immediately update ref so button always has latest value
      displayedDateRef.current = newDate
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1))
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getTimesheetsForDate = (date: Date): TimesheetEntry[] => {
    return timesheets.filter(ts => {
      const tsDate = new Date(ts.date)
      return isSameDay(tsDate, date)
    })
  }

  // Separate entries into clock entries and job entries
  const separateEntries = (dayTimesheets: TimesheetEntry[]) => {
    const clockEntries = dayTimesheets.filter(ts => ts.jobEntries.length === 0)
    const jobEntries = dayTimesheets.filter(ts => ts.jobEntries.length > 0)
    return { clockEntries, jobEntries }
  }

  const calculateDayTotal = (date: Date): number => {
    const dayTimesheets = getTimesheetsForDate(date)
    return dayTimesheets.reduce((sum, ts) => {
      if (ts.totalHours) return sum + ts.totalHours
      if (ts.clockOutTime) {
        const inTime = new Date(ts.clockInTime)
        const outTime = new Date(ts.clockOutTime)
        return sum + (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
      }
      return sum
    }, 0)
  }

  // Day view
  const renderDayView = () => {
    const dayTimesheets = getTimesheetsForDate(currentDate)
    const { clockEntries, jobEntries } = separateEntries(dayTimesheets)
    const dayTotal = calculateDayTotal(currentDate)
    const isToday = isSameDay(currentDate, new Date())

    return (
      <div className="w-full">
        {/* Day Header */}
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          isToday 
            ? 'border-blue-400 bg-blue-50/30' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              {isToday && (
                <p className="text-sm text-blue-600 font-medium mt-1">Today</p>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {dayTotal.toFixed(2)}h
            </div>
          </div>
        </div>

        {/* Clock In/Out Entries */}
        {clockEntries.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Clock In/Out Entries
            </h4>
            <div className="space-y-2">
              {clockEntries.map((ts) => (
                <div
                  key={ts.id}
                  onClick={(e) => handleEntryClick(ts, e)}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold text-blue-800 text-lg">
                        {(() => {
                          const clockIn = new Date(ts.clockInTime)
                          const clockOut = ts.clockOutTime ? new Date(ts.clockOutTime) : null
                          if (isNaN(clockIn.getTime())) {
                            return 'Invalid time'
                          }
                          return `${format(clockIn, 'h:mm a')}${clockOut ? ` - ${format(clockOut, 'h:mm a')}` : ''}`
                        })()}
                      </div>
                      {ts.totalHours && (
                        <div className="text-blue-600 font-medium mt-1">
                          {ts.totalHours.toFixed(2)} hours
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        ts.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : ts.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ts.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {clockEntries.length > 0 && jobEntries.length > 0 && (
          <div className="my-6 border-t border-gray-300"></div>
        )}

        {/* Job Entries */}
        {jobEntries.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              Job Entries
            </h4>
            <div className="space-y-2">
              {jobEntries.map((ts) => (
                <div
                  key={ts.id}
                  onClick={(e) => handleEntryClick(ts, e)}
                  className="p-4 bg-green-50 border-2 border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                >
                  {ts.jobEntries.map((job, idx) => (
                    <div key={job.id} className={idx > 0 ? 'mt-3 pt-3 border-t border-green-300' : ''}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-semibold text-green-800 text-lg">
                            {(() => {
                              const jobStart = new Date(job.punchInTime)
                              const jobEnd = job.punchOutTime ? new Date(job.punchOutTime) : null
                              return `${format(jobStart, 'h:mm a')}${jobEnd ? ` - ${format(jobEnd, 'h:mm a')}` : ''}`
                            })()}
                          </div>
                          <div className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">Job:</span> {job.jobNumber}
                            {job.laborCode && (
                              <> • <span className="font-medium">Labor Code:</span> {job.laborCode}</>
                            )}
                          </div>
                          {job.notes && (
                            <div className="text-sm text-gray-600 mt-1 italic">
                              {job.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-green-700 font-semibold">
                          {(() => {
                            if (job.punchOutTime) {
                              const inTime = new Date(job.punchInTime)
                              const outTime = new Date(job.punchOutTime)
                              const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
                              return `${hours.toFixed(2)}h`
                            }
                            return '—'
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {clockEntries.length === 0 && jobEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No entries for this day</p>
            <p className="text-sm">Click "Add Entry" to create a new timesheet entry</p>
          </div>
        )}
      </div>
    )
  }

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }) // Saturday
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {/* Header */}
        {weekDays.map((day, idx) => (
          <div key={idx} className="hidden sm:block text-center font-semibold text-gray-700 py-2 border-b">
            {format(day, 'EEE')}
            <div className="text-sm font-normal text-gray-500">{format(day, 'MMM d')}</div>
          </div>
        ))}

        {/* Days */}
        {weekDays.map((day, idx) => {
          const dayTimesheets = getTimesheetsForDate(day)
          const { clockEntries, jobEntries } = separateEntries(dayTimesheets)
          const dayTotal = calculateDayTotal(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={idx}
              className={`min-h-[200px] sm:min-h-[200px] border-2 rounded-lg p-2 sm:p-2 cursor-pointer transition-colors ${
                isToday 
                  ? 'border-blue-400 bg-blue-50/30' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
              }`}
              onClick={() => handleDateClick(day)}
            >
              <div className="text-xs font-medium text-gray-600 mb-2">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {/* Clock In/Out Entries */}
                {clockEntries.map((ts) => (
                  <div
                    key={ts.id}
                    onClick={(e) => handleEntryClick(ts, e)}
                    className="text-xs p-1.5 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 transition-colors"
                  >
                    <div className="font-medium text-blue-800">
                      {(() => {
                        const clockInStr = ts.clockInTime
                        const clockOutStr = ts.clockOutTime
                        const clockIn = new Date(clockInStr)
                        const clockOut = clockOutStr ? new Date(clockOutStr) : null
                        if (isNaN(clockIn.getTime())) {
                          return 'Invalid time'
                        }
                        return `${format(clockIn, 'h:mm a')}${clockOut ? ` - ${format(clockOut, 'h:mm a')}` : ''}`
                      })()}
                    </div>
                    {ts.totalHours && (
                      <div className="text-blue-600">{ts.totalHours.toFixed(2)}h</div>
                    )}
                  </div>
                ))}

                {/* Divider between clock entries and job entries */}
                {clockEntries.length > 0 && jobEntries.length > 0 && (
                  <div className="my-2 border-t border-gray-300 flex items-center">
                    <span className="text-[10px] text-gray-500 px-2 bg-white">Jobs</span>
                  </div>
                )}

                {/* Job Entries */}
                {jobEntries.map((ts) => (
                  <div
                    key={ts.id}
                    onClick={(e) => handleEntryClick(ts, e)}
                    className="text-xs p-1.5 bg-green-100 border border-green-200 rounded hover:bg-green-200 transition-colors"
                  >
                    <div className="font-medium text-green-800">
                      {(() => {
                        const firstJob = ts.jobEntries[0]
                        const jobStart = new Date(firstJob.punchInTime)
                        const jobEnd = firstJob.punchOutTime ? new Date(firstJob.punchOutTime) : null
                        return `${format(jobStart, 'h:mm a')}${jobEnd ? ` - ${format(jobEnd, 'h:mm a')}` : ''}`
                      })()}
                    </div>
                    {ts.jobEntries.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {ts.jobEntries[0].jobNumber} • {ts.jobEntries.length} job{ts.jobEntries.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {dayTotal > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-bold text-blue-700 text-center">
                    {dayTotal.toFixed(2)}h
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 }) // Sunday

    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="hidden sm:block text-center font-semibold text-gray-700 py-2 border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((weekStart, weekIdx) => {
          const weekDays = eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 0 }) // Saturday
          })

          return (
            <div key={weekIdx} className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDays.map((day, dayIdx) => {
                const dayTimesheets = getTimesheetsForDate(day)
                const { clockEntries, jobEntries } = separateEntries(dayTimesheets)
                const dayTotal = calculateDayTotal(day)
                const isToday = isSameDay(day, new Date())
                const isCurrentMonth = isSameMonth(day, currentDate)

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[120px] sm:min-h-[120px] border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                      !isCurrentMonth 
                        ? 'border-gray-100 bg-gray-50 opacity-50' 
                        : isToday
                        ? 'border-blue-400 bg-blue-50/30'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className={`text-xs font-medium mb-1 ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-600'}`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-0.5">
                      {/* Clock In/Out Entries */}
                      {clockEntries.slice(0, 2).map((ts) => (
                        <div
                          key={ts.id}
                          onClick={(e) => handleEntryClick(ts, e)}
                          className="text-xs p-1 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 transition-colors"
                        >
                          <div className="font-medium text-blue-800 truncate">
                            {(() => {
                              const clockIn = new Date(ts.clockInTime)
                              const clockOut = ts.clockOutTime ? new Date(ts.clockOutTime) : null
                              return `${format(clockIn, 'h:mm')}${clockOut ? `-${format(clockOut, 'h:mm')}` : ''}`
                            })()}
                          </div>
                        </div>
                      ))}

                      {/* Divider */}
                      {clockEntries.length > 0 && jobEntries.length > 0 && clockEntries.length <= 2 && (
                        <div className="my-0.5 border-t border-gray-300"></div>
                      )}

                      {/* Job Entries */}
                      {jobEntries.slice(0, clockEntries.length >= 2 ? 0 : 2 - clockEntries.length).map((ts) => (
                        <div
                          key={ts.id}
                          onClick={(e) => handleEntryClick(ts, e)}
                          className="text-xs p-1 bg-green-100 border border-green-200 rounded hover:bg-green-200 transition-colors"
                        >
                          <div className="font-medium text-green-800 truncate">
                            {(() => {
                              const firstJob = ts.jobEntries[0]
                              const jobStart = new Date(firstJob.punchInTime)
                              const jobEnd = firstJob.punchOutTime ? new Date(firstJob.punchOutTime) : null
                              return `${format(jobStart, 'h:mm')}${jobEnd ? `-${format(jobEnd, 'h:mm')}` : ''}`
                            })()}
                          </div>
                        </div>
                      ))}

                      {/* Show count if there are more entries */}
                      {(clockEntries.length + jobEntries.length) > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{(clockEntries.length + jobEntries.length) - 2} more
                        </div>
                      )}
                    </div>

                    {dayTotal > 0 && (
                      <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="text-xs font-bold text-blue-700 text-center">
                          {dayTotal.toFixed(1)}h
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar View
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* User Selector (Admin only) */}
                {isAdmin && (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                )}

                {/* Add Entry Button */}
                <Button
                  onClick={handleMainAddEntry}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Entry</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* View Mode Tabs - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
                  <TabsTrigger value="day" className="text-xs sm:text-sm">
                    Day
                  </TabsTrigger>
                  <TabsTrigger value="week" className="text-xs sm:text-sm">
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month" className="text-xs sm:text-sm">
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Navigation */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'day') navigateDay('prev')
                    else if (viewMode === 'week') navigateWeek('prev')
                    else navigateMonth('prev')
                  }}
                  className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 font-medium"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 font-medium"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'day') navigateDay('next')
                    else if (viewMode === 'week') navigateWeek('next')
                    else navigateMonth('next')
                  }}
                  className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 font-medium"
                >
                  <span className="mr-1 hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Date Display */}
              <div className="text-sm font-medium text-gray-700 px-3 text-center sm:text-left w-full sm:w-auto">
                {viewMode === 'day'
                  ? format(currentDate, 'EEEE, MMMM d, yyyy')
                  : viewMode === 'week'
                  ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading timesheets...</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              {viewMode === 'day' 
                ? renderDayView() 
                : viewMode === 'week' 
                ? renderWeekView() 
                : renderMonthView()
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Timesheet Modal */}
      <DayTimesheetModal
        isOpen={isDayModalOpen && !!selectedDate}
        onClose={handleDayModalClose}
        selectedDate={selectedDate || new Date()}
        timesheets={timesheets}
        onAddEntry={handleAddEntry}
        onEditEntry={handleEditEntry}
        userId={selectedUserId}
        jobs={jobs}
        laborCodes={laborCodes}
      />

      {/* Entry Modal - Only show if day modal is not open */}
      {isModalOpen && modalDate && !isDayModalOpen && (
        <TimeEntryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          selectedDate={new Date(modalDate)}
          selectedEntry={selectedEntry}
          userId={selectedUserId}
          userName={users.find(u => u.id === selectedUserId)?.name || users.find(u => u.id === selectedUserId)?.email || ''}
          users={users}
          jobs={jobs}
          laborCodes={laborCodes}
          isAdmin={isAdmin}
          key={`${modalDate.getTime()}-${isModalOpen}`}
        />
      )}
    </div>
  )
}

