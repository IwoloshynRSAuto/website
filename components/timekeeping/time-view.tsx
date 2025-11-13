'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, ChevronLeft, ChevronRight, Clock, Send, Loader2 } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addDays, subDays, startOfDay, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
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
  jobEntries: Array<{
    id: string
    jobNumber: string
    laborCode: string
    punchInTime: string
    punchOutTime: string | null
    notes: string | null
  }>
}

interface TimeViewProps {
  currentUserId: string
  currentUserName: string
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  isAdmin: boolean
}

export function TimeView({
  currentUserId,
  currentUserName,
  users,
  jobs,
  laborCodes,
  isAdmin
}: TimeViewProps) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  // Single source of truth for the currently displayed day
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()))
  // The date passed into the TimeEntryModal when opened
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId)
  // Store the date to use for the modal - set before opening
  const [modalDate, setModalDate] = useState<Date | null>(null)
  
  // Ref to always get the latest currentDate value
  const currentDateRef = useRef(currentDate)
  useEffect(() => {
    currentDateRef.current = currentDate
  }, [currentDate])

  // Stable getter — always returns the latest currentDate
  const getCurrentDate = useCallback(() => currentDateRef.current, [])

  // Load timesheets - only entries with job entries
  const loadTimesheets = useCallback(async () => {
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
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 })
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      }

      const response = await fetch(
        `/api/timesheets?userId=${selectedUserId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filter to only show job time entries (entries with job entries)
        const jobEntries = data.filter((ts: TimesheetEntry) => ts.jobEntries.length > 0)
        setTimesheets(jobEntries)
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load job time records',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
    // toast is stable from useToast hook, no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, currentDate, viewMode])

  useEffect(() => {
    loadTimesheets()
  }, [loadTimesheets])

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEntry(null)
    setIsModalOpen(false)
    setIsDayModalOpen(true)
  }

  // Handler for clicking the day header in day view
  const handleDayHeaderClick = () => {
    if (viewMode === 'day') {
      // In day view, we don't need to set selectedDate - the modal will use currentDate directly
      // Just open the modal
      setSelectedEntry(null)
      setIsModalOpen(false)
      setIsDayModalOpen(true)
    }
  }

  const handleEntryClick = (entry: TimesheetEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedDate(startOfDay(new Date(entry.date)))
    setSelectedEntry(entry)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedEntry(null)
    if (viewMode !== 'day') {
      setSelectedDate(startOfDay(new Date()))
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

  // Handler that will open the entry modal using the date passed or default to the current date
  // CRITICAL: Always use currentDateRef to get the latest value - never use stale closures
  const handleAddEntry = useCallback((date?: Date) => {
    setIsDayModalOpen(false)
    // Read the latest currentDate from ref
    const latestDate = currentDateRef.current
    const resolvedDate = date ? startOfDay(new Date(date)) : startOfDay(latestDate)
    // Set modalDate and selectedDate, then open modal
    setModalDate(resolvedDate)
    setSelectedDate(resolvedDate)
    setSelectedEntry(null)
    // Use requestAnimationFrame to ensure state updates before modal renders
    requestAnimationFrame(() => {
      setIsModalOpen(true)
    })
  }, [])

  // Handler for the main "Add Entry" button - uses the same handler
  const handleMainAddEntry = useCallback(() => {
    handleAddEntry() // Will read latest currentDate from state setter
  }, [handleAddEntry])

  const handleEditEntry = (entry: TimesheetEntry) => {
    setIsDayModalOpen(false)
    const entryDate = startOfDay(new Date(entry.date))
    setSelectedDate(entryDate)
    setModalDate(entryDate)
    setSelectedEntry(entry)
    setTimeout(() => {
      setIsModalOpen(true)
    }, 0)
  }

  const handleSubmitWeekForApproval = async () => {
    // For non-admins, always use their own user ID
    const userIdToSubmit = isAdmin ? selectedUserId : currentUserId
    
    if (!userIdToSubmit) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive'
      })
      return
    }

    // Show confirmation dialog - ALWAYS show for everyone (admins and non-admins)
    const confirmed = window.confirm(
      'Are you sure you want to submit this week for approval?\n\n' +
      '⚠️ IMPORTANT: Once submitted, you will NOT be able to edit or delete entries for this week until it is approved or rejected.\n\n' +
      'If rejected, you will be able to make changes and resubmit.\n\n' +
      'Do you want to continue?'
    )
    
    if (!confirmed) {
      return
    }

    setIsSubmitting(true)
    try {
      console.log('handleSubmitWeekForApproval - Starting submission:', {
        isAdmin,
        currentUserId,
        selectedUserId,
        userIdToSubmit
      })
      
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      
      // Get all time entries for the week (entries with job entries)
      // Normalize dates to start of day for comparison
      const weekStartNormalized = startOfDay(weekStart)
      const weekEndNormalized = endOfDay(weekEnd)
      
      const weekTimesheets = timesheets.filter(ts => {
        const tsDate = startOfDay(new Date(ts.date))
        return ts.jobEntries.length > 0 && 
               tsDate >= weekStartNormalized && 
               tsDate <= weekEndNormalized
      })

      if (weekTimesheets.length === 0) {
        toast({
          title: 'No entries to submit',
          description: 'Please add job time entries for this week before submitting',
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }

      // Transform timesheets into submission format
      // For time entries, we need jobId and laborCodeId
      const timeEntries: any[] = []
      
      for (const ts of weekTimesheets) {
        for (const jobEntry of ts.jobEntries) {
          // Find job by jobNumber
          const job = jobs.find(j => j.jobNumber === jobEntry.jobNumber)
          if (!job) {
            toast({
              title: 'Error',
              description: `Job ${jobEntry.jobNumber} not found`,
              variant: 'destructive'
            })
            setIsSubmitting(false)
            return
          }

          // Find labor code by code
          const laborCode = laborCodes.find(lc => lc.code === jobEntry.laborCode)
          const laborCodeId = laborCode?.id || null

          // Calculate hours
          let regularHours = 0
          if (jobEntry.punchOutTime) {
            const inTime = new Date(jobEntry.punchInTime)
            const outTime = new Date(jobEntry.punchOutTime)
            regularHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
          }

          timeEntries.push({
            date: new Date(ts.date).toISOString(),
            regularHours: Math.max(0, regularHours),
            overtimeHours: 0,
            notes: jobEntry.notes || null,
            billable: true,
            jobId: job.id,
            laborCodeId: laborCodeId
          })
        }
      }

      // Submit the entire week
      const response = await fetch('/api/timesheet-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToSubmit,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          timeEntries
        }),
      })

      let responseData
      try {
        responseData = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError)
        toast({
          title: 'Error',
          description: `Server error: ${response.status} ${response.statusText}`,
          variant: 'destructive'
        })
        return
      }

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')} submitted for approval. Your entries are now locked and cannot be edited until approved or rejected.`,
          duration: 5000
        })
        // Reload timesheets to reflect the submission and locking
        loadTimesheets()
      } else {
        console.error('Submission error:', {
          status: response.status,
          statusText: response.statusText,
          responseData
        })
        const errorMessage = responseData.error || 
                             responseData.details?.[0]?.message || 
                             responseData.message ||
                             `Failed to submit timesheet (${response.status})`
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit timesheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = startOfDay(direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
      // In day view, update selectedDate to keep it in sync
      if (viewMode === 'day') {
        setSelectedDate(newDate)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    })
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
    const today = startOfDay(new Date())
    setCurrentDate(today)
    if (viewMode === 'day') {
      setSelectedDate(today)
    }
  }

  const getTimesheetsForDate = (date: Date): TimesheetEntry[] => {
    return timesheets.filter(ts => {
      const tsDate = new Date(ts.date)
      return isSameDay(tsDate, date)
    })
  }

  const calculateDayTotal = (date: Date): number => {
    const dayTimesheets = getTimesheetsForDate(date)
    return dayTimesheets.reduce((sum, ts) => {
      return sum + ts.jobEntries.reduce((jobSum, job) => {
        if (job.punchOutTime) {
          const inTime = new Date(job.punchInTime)
          const outTime = new Date(job.punchOutTime)
          return jobSum + (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
        }
        return jobSum
      }, 0)
    }, 0)
  }

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
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
          const dayTotal = calculateDayTotal(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={idx}
              className={`min-h-[200px] border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                isToday 
                  ? 'border-green-400 bg-green-50/30' 
                  : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/20'
              }`}
              onClick={() => handleDateClick(day)}
            >
              <div className="text-xs font-medium text-gray-600 mb-2">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayTimesheets.map((ts) => (
                  ts.jobEntries.map((job) => (
                    <div
                      key={job.id}
                      onClick={(e) => handleEntryClick(ts, e)}
                      className="text-xs p-1.5 bg-green-100 border border-green-200 rounded hover:bg-green-200 transition-colors"
                    >
                      <div className="font-medium text-green-800">
                        {(() => {
                          const jobStart = new Date(job.punchInTime)
                          const jobEnd = job.punchOutTime ? new Date(job.punchOutTime) : null
                          return `${format(jobStart, 'h:mm a')}${jobEnd ? ` - ${format(jobEnd, 'h:mm a')}` : ''}`
                        })()}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {job.jobNumber} • {job.laborCode}
                      </div>
                    </div>
                  ))
                ))}
              </div>

              {dayTotal > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-bold text-green-700 text-center">
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

  // Day view
  const renderDayView = () => {
    const dayTimesheets = getTimesheetsForDate(currentDate)
    const dayTotal = calculateDayTotal(currentDate)
    const isToday = isSameDay(currentDate, new Date())

    return (
      <div className="w-full">
        {/* Day Header */}
        <div 
          onClick={handleDayHeaderClick}
          className={`mb-4 p-4 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday 
              ? 'border-green-400 bg-green-50/30' 
              : 'border-gray-200 bg-white'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900">
                <span className="sm:hidden">{format(currentDate, 'EEE, MMM d, yyyy')}</span>
                <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
              </h3>
              {isToday && (
                <p className="text-sm text-green-600 font-medium mt-1">Today</p>
              )}
            </div>
            <div className="text-2xl font-bold text-green-700">
              {dayTotal.toFixed(2)}h
            </div>
          </div>
        </div>

        {/* Job Time Entries */}
        {dayTimesheets.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              Job Time Entries
            </h4>
            <div className="space-y-2">
              {dayTimesheets.map((ts) => (
                ts.jobEntries.map((job) => (
                  <div
                    key={job.id}
                    onClick={(e) => handleEntryClick(ts, e)}
                    className="p-4 bg-green-50 border-2 border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  >
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
                ))
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {dayTimesheets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No entries for this day</p>
            <p className="text-sm">Click "Add Time" to create a new job time entry</p>
          </div>
        )}
      </div>
    )
  }

  // Month view
  // Month view - calendar grid with day cells
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthStartWeek = startOfWeek(monthStart, { weekStartsOn: 0 })
    const monthEndWeek = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const calendarDays = eachDayOfInterval({ start: monthStartWeek, end: monthEndWeek })
    
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()

    return (
      <div className="w-full">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day Headers */}
          {weekDays.map((dayName) => (
            <div
              key={dayName}
              className="text-center font-semibold text-gray-700 py-2 text-xs sm:text-sm border-b border-gray-200"
            >
              {dayName}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day, idx) => {
            const dayTimesheets = getTimesheetsForDate(day)
            const dayTotal = calculateDayTotal(day)
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = viewMode === 'day' && isSameDay(day, currentDate)
            const hasEntries = dayTimesheets.length > 0

            return (
              <div
                key={idx}
                onClick={() => {
                  setCurrentDate(startOfDay(day))
                  setViewMode('day')
                  setSelectedDate(startOfDay(day))
                }}
                className={`
                  min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border rounded-lg cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-300' 
                    : isToday
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
                  }
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                `}
              >
                {/* Day Number */}
                <div className={`
                  text-xs sm:text-sm font-medium mb-1
                  ${isToday ? 'text-green-600 font-bold' : 'text-gray-700'}
                  ${isSelected ? 'text-green-700' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Entry Indicators */}
                {hasEntries && (
                  <div className="flex flex-col gap-0.5">
                    {dayTimesheets.slice(0, 2).map((ts) => (
                      <div
                        key={ts.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEntryClick(ts, e)
                        }}
                        className="text-[10px] sm:text-xs px-1 py-0.5 bg-green-100 border border-green-200 rounded truncate hover:bg-green-200 transition-colors"
                        title={`${ts.jobEntries.length} job entries - ${dayTotal.toFixed(2)}h`}
                      >
                        {ts.jobEntries.length > 0 ? `${ts.jobEntries.length} jobs` : 'Entry'}
                      </div>
                    ))}
                    {dayTimesheets.length > 2 && (
                      <div className="text-[10px] text-green-600 font-medium px-1">
                        +{dayTimesheets.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {/* Total Hours Indicator */}
                {dayTotal > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <div className="text-[10px] sm:text-xs font-bold text-green-700 text-center">
                      {dayTotal.toFixed(1)}h
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Time (Job Tracking)
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
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

                <Button
                  onClick={handleMainAddEntry}
                  className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-4 py-2 rounded-lg"
                  size="sm"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Time</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <TabsTrigger 
                    value="day" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Day
                  </TabsTrigger>
                  <TabsTrigger 
                    value="week" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Week
                  </TabsTrigger>
                  <TabsTrigger 
                    value="month" 
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md min-h-[44px] sm:min-h-[36px]"
                  >
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'day') navigateDay('prev')
                    else if (viewMode === 'week') navigateWeek('prev')
                    else navigateMonth('prev')
                  }}
                  className="flex-1 sm:flex-initial border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100 font-semibold text-gray-700 hover:text-green-700 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="ml-1 hidden sm:inline">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="flex-1 sm:flex-initial border-2 border-green-300 bg-green-50 hover:bg-green-100 active:bg-green-200 font-semibold text-green-700 hover:text-green-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
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
                  className="flex-1 sm:flex-initial border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100 font-semibold text-gray-700 hover:text-green-700 transition-all duration-200 min-h-[44px] rounded-lg shadow-sm hover:shadow-md"
                >
                  <span className="mr-1 hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-base sm:text-lg font-bold text-gray-900 px-3 py-2 text-center sm:text-left bg-gray-50 rounded-lg border border-gray-200">
                  {viewMode === 'day'
                    ? (
                        <>
                          <span className="sm:hidden">{format(currentDate, 'EEE, MMM d, yyyy')}</span>
                          <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
                        </>
                      )
                    : viewMode === 'week'
                    ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
                    : (
                        <>
                          <span className="sm:hidden">{format(currentDate, 'MMM yyyy')}</span>
                          <span className="hidden sm:inline">{format(currentDate, 'MMMM yyyy')}</span>
                        </>
                      )
                  }
                </div>
                {/* Submit for Approval button - show in week view, next to date */}
                {viewMode === 'week' && (
                  <Button
                    onClick={handleSubmitWeekForApproval}
                    disabled={isSubmitting || !selectedUserId}
                    className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm sm:text-base font-bold shadow-lg hover:shadow-xl active:shadow-inner transition-all duration-200 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    size="sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                        <span className="font-semibold">Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="hidden sm:inline font-semibold">Submit for Approval</span>
                        <span className="sm:hidden font-semibold">Submit</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading job time records...</p>
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

      <DayTimesheetModal
        isOpen={isDayModalOpen && !!selectedDate}
        onClose={handleDayModalClose}
        selectedDate={viewMode === 'day' ? currentDate : (selectedDate || currentDate)}
        timesheets={timesheets}
        onAddEntry={handleAddEntry}
        onEditEntry={handleEditEntry}
        userId={selectedUserId}
        jobs={jobs}
        laborCodes={laborCodes}
        getCurrentDate={getCurrentDate}
        key={viewMode === 'day' ? `day-modal-${currentDate.getTime()}` : `day-modal-${selectedDate?.getTime() || 'none'}`}
      />

      {isModalOpen && !isDayModalOpen && modalDate && (
        <TimeEntryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          selectedDate={modalDate}
          selectedEntry={selectedEntry}
          userId={selectedUserId}
          userName={users.find(u => u.id === selectedUserId)?.name || users.find(u => u.id === selectedUserId)?.email || ''}
          users={users}
          jobs={jobs}
          laborCodes={laborCodes}
          isAdmin={isAdmin}
          mode="job"
          key={`time-entry-${modalDate.toISOString()}-${selectedEntry?.id || 'new'}`}
        />
      )}
    </div>
  )
}

