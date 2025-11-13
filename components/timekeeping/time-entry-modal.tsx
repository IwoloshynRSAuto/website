'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, User, FileText, Loader2, X, Plus, LogIn, LogOut, Calendar, Trash2 } from 'lucide-react'
import { TimePicker } from '@/components/ui/time-picker'
import { SimpleDatePicker } from '@/components/ui/simple-date-picker'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useToast } from '@/components/ui/use-toast'
import { format, startOfDay } from 'date-fns'
import { roundTimeString, formatTime12Hour, convert12To24Hour, calculateHoursBetween } from '@/lib/utils/time-rounding'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'

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

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedEntry: TimesheetEntry | null
  userId: string
  userName: string
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  isAdmin: boolean
  mode: 'clock' | 'job' // Locked mode - no tab switching
}

export function TimeEntryModal({
  isOpen,
  onClose,
  selectedDate,
  selectedEntry,
  userId,
  userName,
  users,
  jobs,
  laborCodes,
  isAdmin,
  mode
}: TimeEntryModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false)
  const [changeRequestClockIn, setChangeRequestClockIn] = useState('')
  const [changeRequestClockOut, setChangeRequestClockOut] = useState('')
  const [changeRequestNote, setChangeRequestNote] = useState('')
  // Modal maintains local state for editable fields but must initialize from selectedDate
  // Always normalize to startOfDay to avoid timezone issues
  const [entryDate, setEntryDate] = useState<Date>(() => startOfDay(selectedDate ?? new Date()))

  // Clock In/Out fields
  const [selectedUserId, setSelectedUserId] = useState(userId)
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')
  const [hasActiveClockIn, setHasActiveClockIn] = useState(false)
  const [activeTimesheetId, setActiveTimesheetId] = useState<string | null>(null)

  // Job Entry fields - declare BEFORE useEffect that uses them
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedLaborCodeId, setSelectedLaborCodeId] = useState('')
  const [jobStartTime, setJobStartTime] = useState('')
  const [jobEndTime, setJobEndTime] = useState('')
  const [notes, setNotes] = useState('')

  // Wrapper for setClockOutTime that validates against clockInTime
  const handleClockOutTimeChange = (newTime: string) => {
    if (!newTime) {
      setClockOutTime('')
      return
    }
    
    if (clockInTime) {
      const clockIn24 = convert12To24Hour(clockInTime)
      const clockOut24 = convert12To24Hour(newTime)
      const [inHours, inMinutes] = clockIn24.split(':').map(Number)
      const [outHours, outMinutes] = clockOut24.split(':').map(Number)
      
      const inMinutesTotal = inHours * 60 + inMinutes
      const outMinutesTotal = outHours * 60 + outMinutes
      
      // Only set if clock out is after clock in
      if (outMinutesTotal > inMinutesTotal) {
        setClockOutTime(newTime)
      } else {
        toast({
          title: 'Invalid Time',
          description: 'Clock out time must be after clock in time',
          variant: 'destructive'
        })
      }
    } else {
      setClockOutTime(newTime)
    }
  }

  // Validate clock out time when clock in time changes
  useEffect(() => {
    if (clockInTime && clockOutTime) {
      const clockIn24 = convert12To24Hour(clockInTime)
      const clockOut24 = convert12To24Hour(clockOutTime)
      const [inHours, inMinutes] = clockIn24.split(':').map(Number)
      const [outHours, outMinutes] = clockOut24.split(':').map(Number)
      
      const inMinutesTotal = inHours * 60 + inMinutes
      const outMinutesTotal = outHours * 60 + outMinutes
      
      // If clock out is before or equal to clock in, clear it
      if (outMinutesTotal <= inMinutesTotal) {
        setClockOutTime('')
      }
    }
  }, [clockInTime, clockOutTime])

  // Validate job end time when job start time changes - rewritten to avoid initialization issues
  useEffect(() => {
    // Only run if both times are set and valid
    if (!jobStartTime || !jobEndTime) {
      return
    }
    
    try {
      const start24 = convert12To24Hour(jobStartTime)
      const end24 = convert12To24Hour(jobEndTime)
      
      if (!start24 || !end24) {
        return
      }
      
      const startParts = start24.split(':')
      const endParts = end24.split(':')
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        return
      }
      
      const startHours = parseInt(startParts[0], 10)
      const startMinutes = parseInt(startParts[1], 10)
      const endHours = parseInt(endParts[0], 10)
      const endMinutes = parseInt(endParts[1], 10)
      
      // Validate parsed values
      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        return
      }
      
      const startMinutesTotal = (startHours * 60) + startMinutes
      const endMinutesTotal = (endHours * 60) + endMinutes
      
      // Ensure values are valid before comparison
      if (startMinutesTotal >= 0 && endMinutesTotal >= 0) {
        // If end is before or equal to start, clear it
        if (endMinutesTotal <= startMinutesTotal) {
          setJobEndTime('')
        }
      }
    } catch (error) {
      console.error('Error validating job times:', error)
      // Don't clear on error, just log it
    }
  }, [jobStartTime, jobEndTime])

  // Wrapper for setJobEndTime that validates against jobStartTime - rewritten to avoid initialization issues
  const handleJobEndTimeChange = (newTime: string) => {
    if (!newTime) {
      setJobEndTime('')
      return
    }
    
    if (!jobStartTime) {
      setJobEndTime(newTime)
      return
    }
    
    try {
      const start24 = convert12To24Hour(jobStartTime)
      const end24 = convert12To24Hour(newTime)
      
      if (!start24 || !end24) {
        setJobEndTime(newTime)
        return
      }
      
      const startParts = start24.split(':')
      const endParts = end24.split(':')
      
      if (startParts.length !== 2 || endParts.length !== 2) {
        setJobEndTime(newTime)
        return
      }
      
      const startHours = parseInt(startParts[0], 10)
      const startMinutes = parseInt(startParts[1], 10)
      const endHours = parseInt(endParts[0], 10)
      const endMinutes = parseInt(endParts[1], 10)
      
      // Validate parsed values
      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        setJobEndTime(newTime)
        return
      }
      
      const startMinutesTotal = (startHours * 60) + startMinutes
      const endMinutesTotal = (endHours * 60) + endMinutes
      
      // Ensure values are valid before comparison
      if (startMinutesTotal >= 0 && endMinutesTotal >= 0) {
        // Only set if end is after start
        if (endMinutesTotal > startMinutesTotal) {
          setJobEndTime(newTime)
        } else {
          toast({
            title: 'Invalid Time',
            description: 'End time must be after start time',
            variant: 'destructive'
          })
        }
      } else {
        // If values are invalid, just set the time
        setJobEndTime(newTime)
      }
    } catch (error) {
      console.error('Error validating job end time:', error)
      // On error, just set the time
      setJobEndTime(newTime)
    }
  }

  // Ensure entryDate updates when selectedDate prop changes (keeps modal in sync)
  // This is critical for new entries to always show the correct date
  useEffect(() => {
    if (!selectedEntry && selectedDate) {
      // Only update for new entries, not when editing
      const newDate = startOfDay(new Date(selectedDate))
      setEntryDate(newDate)
    }
  }, [selectedDate, selectedEntry])

  // Check for active clock-in function - use useCallback to avoid dependency issues
  const checkActiveClockIn = useCallback(async () => {
    if (!selectedUserId) return
    
    try {
      const today = startOfDay(new Date())
      const response = await fetch(`/api/timesheets?userId=${selectedUserId}&startDate=${today.toISOString()}&endDate=${today.toISOString()}`)
      if (response.ok) {
        const timesheets = await response.json()
        // Find active timesheet (clocked in but not clocked out)
        const activeTimesheet = timesheets.find((ts: any) => 
          ts.clockInTime && !ts.clockOutTime && ts.status === 'in-progress'
        )
        
        if (activeTimesheet) {
          setHasActiveClockIn(true)
          setActiveTimesheetId(activeTimesheet.id)
          // If editing the active timesheet, populate clock in time
          if (selectedEntry?.id === activeTimesheet.id) {
            const clockIn12 = formatTime12Hour(new Date(activeTimesheet.clockInTime))
            setClockInTime(clockIn12)
          }
        } else {
          setHasActiveClockIn(false)
          setActiveTimesheetId(null)
        }
      }
    } catch (error) {
      console.error('Error checking active clock-in:', error)
    }
  }, [selectedUserId, selectedEntry])

  // Check for active clock-in when modal opens or user changes
  useEffect(() => {
    if (mode === 'clock' && isOpen && selectedUserId) {
      checkActiveClockIn()
    }
  }, [mode, isOpen, selectedUserId, checkActiveClockIn])

  useEffect(() => {
    if (selectedEntry) {
      // Editing existing entry
      setSelectedUserId(selectedEntry.userId)
      setEntryDate(new Date(selectedEntry.date))
      setClockInTime(formatTime12Hour(new Date(selectedEntry.clockInTime)))
      if (selectedEntry.clockOutTime) {
        setClockOutTime(formatTime12Hour(new Date(selectedEntry.clockOutTime)))
      }
      if (selectedEntry.jobEntries.length > 0) {
        const firstJob = selectedEntry.jobEntries[0]
        const job = jobs.find(j => j.jobNumber === firstJob.jobNumber)
        const laborCode = laborCodes.find(lc => lc.code === firstJob.laborCode)
        if (job) setSelectedJobId(job.id)
        if (laborCode) setSelectedLaborCodeId(laborCode.id)
        setJobStartTime(formatTime12Hour(new Date(firstJob.punchInTime)))
        if (firstJob.punchOutTime) {
          setJobEndTime(formatTime12Hour(new Date(firstJob.punchOutTime)))
        }
        if (firstJob.notes) setNotes(firstJob.notes)
        // Mode is locked, no need to switch tabs
      }
    } else {
      // New entry - reset fields
      setSelectedUserId(userId)
      // Use selectedDate, defaulting to today if undefined
      const newEntryDate = selectedDate ? startOfDay(new Date(selectedDate)) : startOfDay(new Date())
      setEntryDate(newEntryDate)
      setClockInTime('')
      setClockOutTime('')
      setSelectedJobId('')
      setSelectedLaborCodeId('')
      setJobStartTime('')
      setJobEndTime('')
      setNotes('')
      // Mode is locked, no need to switch tabs
    }
  }, [selectedEntry, userId, jobs, laborCodes, selectedDate, mode])

  const handleSaveClockInOut = async () => {
    // Check if entry is locked
    if (selectedEntry && (selectedEntry as any).isLocked) {
      toast({
        title: 'Entry Locked',
        description: 'This entry has been submitted for approval and cannot be edited.',
        variant: 'default'
      })
      return
    }

    // Determine if this is a clock in or clock out action
    const isClockIn = !hasActiveClockIn && clockInTime && !clockOutTime
    const isClockOut = (hasActiveClockIn || clockInTime) && clockOutTime

    // If clocking in, check that user is not already clocked in
    if (isClockIn && hasActiveClockIn && !selectedEntry) {
      toast({
        title: 'Error',
        description: 'You are already clocked in. Please clock out first.',
        variant: 'destructive'
      })
      return
    }

    // If clocking out, check that user is clocked in
    if (isClockOut && !hasActiveClockIn && !clockInTime && !selectedEntry) {
      toast({
        title: 'Error',
        description: 'You must clock in first before clocking out.',
        variant: 'destructive'
      })
      return
    }

    // For clock in, clockInTime is required
    if (isClockIn && !clockInTime) {
      toast({
        title: 'Error',
        description: 'Please clock in to record the current time',
        variant: 'destructive'
      })
      return
    }

    // For clock out, we need either an active timesheet or clock in time
    if (isClockOut && !clockOutTime) {
      toast({
        title: 'Error',
        description: 'Please clock out to record the current time',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      // For clock out, we may not have clockInTime set if using active timesheet
      let clockInDate: Date
      if (isClockOut && hasActiveClockIn && activeTimesheetId) {
        // Get clock in time from active timesheet
        const response = await fetch(`/api/timesheets/${activeTimesheetId}`)
        if (response.ok) {
          const timesheet = await response.json()
          clockInDate = new Date(timesheet.clockInTime)
        } else {
          throw new Error('Failed to fetch active timesheet')
        }
      } else {
        // Use clock in time from form
        const clockIn24 = convert12To24Hour(clockInTime)
        const roundedClockIn = roundTimeString(clockIn24)
        const [hours, minutes] = roundedClockIn.split(':').map(Number)
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        clockInDate = new Date(year, month, day, hours, minutes, 0, 0)
      }

      let clockOutDate: Date | null = null
      if (clockOutTime) {
        const clockOut24 = convert12To24Hour(clockOutTime)
        const roundedClockOut = roundTimeString(clockOut24)
        const [outHours, outMinutes] = roundedClockOut.split(':').map(Number)
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        clockOutDate = new Date(year, month, day, outHours, outMinutes, 0, 0)
        
        // Validate that clock out is after clock in
        if (clockOutDate <= clockInDate) {
          toast({
            title: 'Error',
            description: 'Clock out time must be after clock in time',
            variant: 'destructive'
          })
          setIsSubmitting(false)
          return
        }
      }

      const year = entryDate.getFullYear()
      const month = entryDate.getMonth()
      const day = entryDate.getDate()

      // Check for overlapping entries on the same date (only for clock in, not clock out)
      if (isClockIn && !selectedEntry) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const checkResponse = await fetch(`/api/timesheets?userId=${selectedUserId}&startDate=${dateStr}&endDate=${dateStr}`)
        if (checkResponse.ok) {
          const existingEntries = await checkResponse.json()
          const hasOverlap = existingEntries.some((entry: any) => {
            if (entry.id === activeTimesheetId) return false // Skip active timesheet
            const existingIn = new Date(entry.clockInTime)
            const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(year, month, day, 23, 59, 59)
            
            // Check if time ranges overlap
            const newIn = clockInDate
            const newOut = clockOutDate || new Date(year, month, day, 23, 59, 59)
            
            // Overlap occurs if: newIn < existingOut && newOut > existingIn
            return newIn < existingOut && newOut > existingIn
          })
          
          if (hasOverlap) {
            toast({
              title: 'Error',
              description: 'This time entry overlaps with an existing entry. Please adjust the time range.',
              variant: 'destructive'
            })
            setIsSubmitting(false)
            return
          }
        }
      }

      // If clocking out an active timesheet, use the active timesheet ID
      const timesheetIdToUpdate = activeTimesheetId || selectedEntry?.id

      if (timesheetIdToUpdate && (isClockOut || (selectedEntry && !isClockIn))) {
        // Update existing timesheet (clocking out or editing)
        const updateData: any = {}
        if (isClockOut) {
          updateData.clockOutTime = clockOutDate?.toISOString() || null
          updateData.status = clockOutDate ? 'completed' : 'in-progress'
        } else if (selectedEntry) {
          // Editing existing entry with both times
          updateData.clockInTime = clockInDate.toISOString()
          updateData.clockOutTime = clockOutDate?.toISOString() || null
          updateData.status = clockOutDate ? 'completed' : 'in-progress'
        }

        const response = await fetch(`/api/timesheets/${timesheetIdToUpdate}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update timesheet')
        }
      } else if (isClockIn) {
        // Create new timesheet (clocking in)
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: clockInDate.toISOString(),
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create timesheet')
        }
      }

      const actionMessage = isClockIn 
        ? 'Clocked in successfully' 
        : isClockOut 
        ? 'Clocked out successfully' 
        : 'Timesheet entry saved successfully'
      
      toast({
        title: 'Success',
        description: actionMessage
      })

      // Refresh active clock-in status
      await checkActiveClockIn()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save timesheet entry',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveJobEntry = async () => {
    if (!selectedJobId || !selectedLaborCodeId || !jobStartTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const selectedJob = jobs.find(j => j.id === selectedJobId)
      const selectedLaborCode = laborCodes.find(lc => lc.id === selectedLaborCodeId)

      if (!selectedJob || !selectedLaborCode) {
        throw new Error('Selected job or labor code not found')
      }

      const startTime24 = convert12To24Hour(jobStartTime)
      const roundedStart = roundTimeString(startTime24)
      const [startHours, startMinutes] = roundedStart.split(':').map(Number)

      // Create date using local date components to avoid timezone issues
      const year = entryDate.getFullYear()
      const month = entryDate.getMonth()
      const day = entryDate.getDate()
      const startDate = new Date(year, month, day, startHours, startMinutes, 0, 0)

      let endDate: Date | null = null
      if (jobEndTime) {
        const endTime24 = convert12To24Hour(jobEndTime)
        const roundedEnd = roundTimeString(endTime24)
        const [endHours, endMinutes] = roundedEnd.split(':').map(Number)
        endDate = new Date(year, month, day, endHours, endMinutes, 0, 0)
        
        // Validate that end time is after start time
        if (endDate <= startDate) {
          toast({
            title: 'Error',
            description: 'End time must be after start time',
            variant: 'destructive'
          })
          setIsSubmitting(false)
          return
        }
      }

      // Ensure timesheet exists first
      let timesheetId = selectedEntry?.id
      if (!timesheetId) {
        // Create a timesheet for this date
        const year = entryDate.getFullYear()
        const month = entryDate.getMonth()
        const day = entryDate.getDate()
        const defaultClockIn = new Date(year, month, day, 8, 0, 0, 0)

        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: defaultClockIn.toISOString(),
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create timesheet')
        }

        const newTimesheet = await response.json()
        timesheetId = newTimesheet.id
      }

      // Create or update job entry
      if (selectedEntry?.jobEntries.length > 0) {
        // Update existing job entry
        const existingJob = selectedEntry.jobEntries[0]
        const response = await fetch(`/api/jobs/${existingJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            punchInTime: startDate.toISOString(),
            punchOutTime: endDate?.toISOString() || null,
            notes: notes || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update job entry')
        }
      } else {
        // Create new job entry
        const response = await fetch(`/api/timesheets/${timesheetId}/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobNumber: selectedJob.jobNumber,
            laborCode: selectedLaborCode.code,
            punchInTime: startDate.toISOString(),
            punchOutTime: endDate?.toISOString() || null,
            notes: notes || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create job entry')
        }
      }

      toast({
        title: 'Success',
        description: 'Job entry saved successfully'
      })

      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save job entry',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-auto">
        <DialogHeader className="pb-3 sm:pb-4 border-b relative">
          <div className="flex items-center justify-between pr-8 sm:pr-12">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-2xl font-bold truncate flex-1 min-w-0">
              {selectedEntry ? (
                <>
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline">Edit Time Entry</span>
                  <span className="sm:hidden">Edit</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <span className="hidden sm:inline">Add Time Entry</span>
                  <span className="sm:hidden">Add</span>
                </>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2 absolute right-8 sm:right-12 top-0">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
              <SimpleDatePicker
                date={entryDate}
                setDate={(date) => date && setEntryDate(date)}
                placeholder="Select date"
                className="w-[140px] sm:w-auto"
              />
            </div>
          </div>
          <DialogDescription className="sr-only">
            {selectedEntry 
              ? `Edit an existing ${mode === 'clock' ? 'clock in/out entry' : 'job time entry'}` 
              : `Add a new ${mode === 'clock' ? 'clock in/out entry' : 'job time entry'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-4 sm:mt-6">
          {mode === 'clock' && (
            <div className="space-y-4 sm:space-y-6">
            {isAdmin && (
              <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Employee
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <LogIn className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  Clock In
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700">
                    {clockInTime || (hasActiveClockIn ? 'Already clocked in' : 'Click "Clock In" to record current time')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setClockInTime(formatTime12Hour(rounded))
                    }}
                    disabled={!!clockInTime || hasActiveClockIn}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clock In
                  </Button>
                </div>
                {hasActiveClockIn && !clockInTime && (
                  <p className="text-xs text-red-600 mt-1">You are already clocked in. Please clock out first.</p>
                )}
                {clockInTime && (
                  <p className="text-xs text-gray-500 mt-1">Clock-in time recorded. Use "Request Change" to modify.</p>
                )}
              </div>

              <div className="space-y-2 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                  Clock Out
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700">
                    {clockOutTime || (!hasActiveClockIn && !clockInTime ? 'Clock in first to clock out' : 'Click "Clock Out" to record current time')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      handleClockOutTimeChange(formatTime12Hour(rounded))
                    }}
                    disabled={!!clockOutTime || (!hasActiveClockIn && !clockInTime)}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clock Out
                  </Button>
                </div>
                {!hasActiveClockIn && !clockInTime && (
                  <p className="text-xs text-red-600 mt-1">You must clock in first before you can clock out.</p>
                )}
              </div>
            </div>

            {clockInTime && clockOutTime && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Total Hours</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {calculateHoursBetween(
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(clockInTime)}`),
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(clockOutTime)}`)
                      ).toFixed(2)}h
                    </div>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Clock className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </div>
            )}

            {/* Request Change Button */}
            {(clockInTime || clockOutTime) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeRequestOpen(true)}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Request Change
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              {selectedEntry && (
                <Button 
                  variant="outline"
                  onClick={async () => {
                    // Check if entry is locked
                    if ((selectedEntry as any).isLocked) {
                      toast({
                        title: 'Entry Locked',
                        description: 'This entry has been submitted for approval and cannot be deleted.',
                        variant: 'default'
                      })
                      return
                    }
                    
                    if (!confirm('Are you sure you want to delete this timesheet entry? This will also delete all associated job entries. This action cannot be undone.')) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const response = await fetch(`/api/timesheets/${selectedEntry.id}`, {
                        method: 'DELETE'
                      })
                      if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Failed to delete timesheet')
                      }
                      toast({
                        title: 'Success',
                        description: 'Timesheet entry deleted successfully'
                      })
                      onClose()
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to delete timesheet',
                        variant: 'destructive'
                      })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={(selectedEntry as any).isLocked || isSubmitting}
                  className="h-11 text-sm sm:text-base font-medium border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Entry
                </Button>
              )}
              <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 sm:flex-initial min-w-[100px] h-11 text-sm sm:text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveClockInOut} 
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial min-w-[120px] h-11 text-sm sm:text-base font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
            </div>
          )}

          {mode === 'job' && (
            <div className="space-y-4 sm:space-y-6">
            {isAdmin && (
              <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Employee
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  Start Time *
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobStartTime}
                    onChange={setJobStartTime}
                    className="flex-1 bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setJobStartTime(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-green-50 border-green-300 text-green-700 font-medium min-w-[60px]"
                  >
                    Now
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  End Time (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={jobEndTime}
                    onChange={handleJobEndTimeChange}
                    className="flex-1 bg-white"
                    minTime={jobStartTime || undefined} // Can't select job end before job start
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      handleJobEndTimeChange(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-red-50 border-red-300 text-red-700 font-medium min-w-[60px]"
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  Job Number *
                </Label>
                <SearchableSelect
                  options={jobs.map(job => ({
                    value: job.id,
                    label: `${job.jobNumber} - ${job.title}`,
                    searchText: `${job.jobNumber} ${job.title}`
                  }))}
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  placeholder="Search or select job..."
                  emptyMessage="No jobs found"
                />
              </div>

              <div className="space-y-2 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  Phase Code (Labor Code) *
                </Label>
                <Select value={selectedLaborCodeId} onValueChange={setSelectedLaborCodeId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Labor Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {laborCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.code} - {code.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                Notes (Optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this job entry..."
                rows={3}
                className="bg-white"
              />
            </div>

            {jobStartTime && jobEndTime && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {calculateHoursBetween(
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(jobStartTime)}`),
                        new Date(`${format(entryDate, 'yyyy-MM-dd')} ${convert12To24Hour(jobEndTime)}`)
                      ).toFixed(2)}h
                    </div>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Clock className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              {selectedEntry && selectedEntry.jobEntries.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this job entry? This action cannot be undone.')) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const jobEntryId = selectedEntry.jobEntries[0].id
                      const response = await fetch(`/api/jobs/${jobEntryId}`, {
                        method: 'DELETE'
                      })
                      if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Failed to delete job entry')
                      }
                      toast({
                        title: 'Success',
                        description: 'Job entry deleted successfully'
                      })
                      onClose()
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to delete job entry',
                        variant: 'destructive'
                      })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting}
                  className="h-11 text-sm sm:text-base font-medium border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Job Entry
                </Button>
              )}
              <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 sm:flex-initial min-w-[100px] h-11 text-sm sm:text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveJobEntry} 
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial min-w-[120px] h-11 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Change Request Modal */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Change</DialogTitle>
            <DialogDescription>
              Request a change to your clock-in or clock-out time. This will require admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="change-clock-in">Clock In Time</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={changeRequestClockIn || clockInTime}
                  onChange={setChangeRequestClockIn}
                  className="flex-1 bg-white text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-clock-out">Clock Out Time (Optional)</Label>
              <div className="flex items-center gap-2">
                <TimePicker
                  value={changeRequestClockOut || clockOutTime}
                  onChange={setChangeRequestClockOut}
                  className="flex-1 bg-white text-sm"
                  minTime={changeRequestClockIn || clockInTime || undefined}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-note">Reason for Change *</Label>
              <Textarea
                id="change-note"
                value={changeRequestNote}
                onChange={(e) => setChangeRequestNote(e.target.value)}
                placeholder="Please explain why you need to change the time..."
                rows={4}
                className="bg-white"
                required
              />
              <p className="text-xs text-gray-500">A reason is required for all change requests.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsChangeRequestOpen(false)
                setChangeRequestNote('')
                setChangeRequestClockIn('')
                setChangeRequestClockOut('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!changeRequestNote.trim()) {
                  toast({
                    title: 'Error',
                    description: 'Please provide a reason for the change request',
                    variant: 'destructive'
                  })
                  return
                }

                setIsSubmitting(true)
                try {
                  // Convert time strings to Date objects
                  const year = entryDate.getFullYear()
                  const month = entryDate.getMonth()
                  const day = entryDate.getDate()
                  
                  // Parse clock in time
                  const clockInTimeToUse = changeRequestClockIn || clockInTime
                  const clockIn24 = convert12To24Hour(clockInTimeToUse)
                  const [inHours, inMinutes] = clockIn24.split(':').map(Number)
                  const requestedClockInDate = new Date(year, month, day, inHours, inMinutes, 0, 0)
                  
                  // Parse clock out time if provided
                  let requestedClockOutDate: Date | null = null
                  const clockOutTimeToUse = changeRequestClockOut || clockOutTime
                  if (clockOutTimeToUse) {
                    const clockOut24 = convert12To24Hour(clockOutTimeToUse)
                    const [outHours, outMinutes] = clockOut24.split(':').map(Number)
                    requestedClockOutDate = new Date(year, month, day, outHours, outMinutes, 0, 0)
                  }
                  
                  const response = await fetch('/api/time-change-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      timesheetId: selectedEntry?.id,
                      requestedClockInTime: requestedClockInDate.toISOString(),
                      requestedClockOutTime: requestedClockOutDate?.toISOString() || null,
                      reason: changeRequestNote,
                      date: format(entryDate, 'yyyy-MM-dd')
                    })
                  })

                  if (response.ok) {
                    const result = await response.json()
                    toast({
                      title: 'Success',
                      description: result.message || 'Change request submitted successfully. Waiting for admin approval.',
                      duration: 5000
                    })
                    setIsChangeRequestOpen(false)
                    setChangeRequestNote('')
                    setChangeRequestClockIn('')
                    setChangeRequestClockOut('')
                    onClose()
                    // Reload data to show the change request status
                    if (onClose) {
                      // Trigger a refresh by calling the parent's reload function if available
                      window.location.reload()
                    }
                  } else {
                    const error = await response.json()
                    throw new Error(error.error || 'Failed to submit change request')
                  }
                } catch (error: any) {
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to submit change request',
                    variant: 'destructive'
                  })
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

