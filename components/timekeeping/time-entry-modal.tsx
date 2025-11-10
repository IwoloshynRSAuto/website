'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  defaultTab?: 'clock' | 'job'
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
  defaultTab = 'clock'
}: TimeEntryModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'clock' | 'job'>(defaultTab)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Modal maintains local state for editable fields but must initialize from selectedDate
  // Always normalize to startOfDay to avoid timezone issues
  const [entryDate, setEntryDate] = useState<Date>(() => startOfDay(selectedDate ?? new Date()))

  // Clock In/Out fields
  const [selectedUserId, setSelectedUserId] = useState(userId)
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')

  // Job Entry fields
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedLaborCodeId, setSelectedLaborCodeId] = useState('')
  const [jobStartTime, setJobStartTime] = useState('')
  const [jobEndTime, setJobEndTime] = useState('')
  const [notes, setNotes] = useState('')

  // Ensure entryDate updates when selectedDate prop changes (keeps modal in sync)
  // This is critical for new entries to always show the correct date
  useEffect(() => {
    if (!selectedEntry && selectedDate) {
      // Only update for new entries, not when editing
      const newDate = startOfDay(new Date(selectedDate))
      setEntryDate(newDate)
    }
  }, [selectedDate, selectedEntry])

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
        setActiveTab('job')
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
      setActiveTab('clock')
    }
  }, [selectedEntry, userId, jobs, laborCodes, selectedDate])

  const handleSaveClockInOut = async () => {
    if (!clockInTime) {
      toast({
        title: 'Error',
        description: 'Please enter a clock in time',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const clockIn24 = convert12To24Hour(clockInTime)
      const roundedClockIn = roundTimeString(clockIn24)
      const [hours, minutes] = roundedClockIn.split(':').map(Number)

      // Create date using local date components to avoid timezone issues
      const year = entryDate.getFullYear()
      const month = entryDate.getMonth()
      const day = entryDate.getDate()
      const clockInDate = new Date(year, month, day, hours, minutes, 0, 0)

      let clockOutDate: Date | null = null
      if (clockOutTime) {
        const clockOut24 = convert12To24Hour(clockOutTime)
        const roundedClockOut = roundTimeString(clockOut24)
        const [outHours, outMinutes] = roundedClockOut.split(':').map(Number)
        clockOutDate = new Date(year, month, day, outHours, outMinutes, 0, 0)
      }

      if (selectedEntry) {
        // Update existing timesheet
        const response = await fetch(`/api/timesheets/${selectedEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: clockInDate.toISOString(),
            clockOutTime: clockOutDate?.toISOString() || null,
            status: clockOutDate ? 'completed' : 'in-progress'
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update timesheet')
        }
      } else {
        // Create new timesheet
        const response = await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clockInTime: clockInDate.toISOString(),
            clockOutTime: clockOutDate?.toISOString() || null,
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create timesheet')
        }
      }

      toast({
        title: 'Success',
        description: 'Timesheet entry saved successfully'
      })

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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  Edit Time Entry
                </>
              ) : (
                <>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  Add Time Entry
                </>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2" style={{ position: 'absolute', right: '45px', top: '0' }}>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
              <SimpleDatePicker
                date={entryDate}
                setDate={(date) => date && setEntryDate(date)}
                placeholder="Select date"
              />
            </div>
          </div>
          <DialogDescription className="sr-only">
            {selectedEntry ? 'Edit an existing time entry' : 'Add a new time entry for clock in/out or job tracking'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clock' | 'job')} className="w-full mt-4 sm:mt-6">
          <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="clock" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
            >
              <Clock className="h-4 w-4 mr-2" />
              Clock In/Out
            </TabsTrigger>
            <TabsTrigger 
              value="job"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold"
            >
              <FileText className="h-4 w-4 mr-2" />
              Job Time Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clock" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
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
                  Clock In Time *
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={clockInTime}
                    onChange={setClockInTime}
                    className="flex-1 bg-white text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setClockInTime(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-green-50 border-green-300 text-green-700 font-medium min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm"
                  >
                    Now
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                  Clock Out Time (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <TimePicker
                    value={clockOutTime}
                    onChange={setClockOutTime}
                    className="flex-1 bg-white text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setClockOutTime(formatTime12Hour(rounded))
                    }}
                    className="bg-white hover:bg-red-50 border-red-300 text-red-700 font-medium min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm"
                  >
                    Now
                  </Button>
                </div>
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

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
              {selectedEntry && (
                <Button 
                  variant="outline"
                  onClick={async () => {
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
                  disabled={isSubmitting}
                  className="h-11 text-sm sm:text-base font-medium border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto"
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
          </TabsContent>

          <TabsContent value="job" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
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
                    onChange={setJobEndTime}
                    className="flex-1 bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const rounded = roundToNearest15Minutes(now)
                      setJobEndTime(formatTime12Hour(rounded))
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

