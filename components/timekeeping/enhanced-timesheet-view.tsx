'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks
} from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Plus, X, Check, User, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { debug } from '@/lib/debug'
import { TimeInputWithCalculation } from './time-input-with-calculation'
import { PopupTimeSelector } from './popup-time-selector'

// Types
interface User {
  id: string
  name: string
  email: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface LaborCode {
  id: string
  code: string
  description: string
  hourlyRate: number
}

interface TimeEntry {
  id: string
  date: string
  regularHours: number
  overtimeHours: number
  notes: string | null
  billable: boolean
  rate: number | null
  user: User
  job: Job
  laborCode: LaborCode | null
  createdAt: string
}

interface TimesheetRow {
  id: string
  jobId: string
  jobNumber: string
  jobTitle: string
  laborCodeId: string
  laborCode: string
  notes: string
  dailyEntries: Record<string, {
    regularHours: number
    overtimeHours: number
    timeEntryId?: string
  }>
  totalRegularHours: number
  totalOvertimeHours: number
  totalHours: number
}

interface EnhancedTimesheetViewProps {
  users: User[]
  jobs: Job[]
  laborCodes: LaborCode[]
  currentUserId?: string
  isAdmin?: boolean
}

export function EnhancedTimesheetView({ users, jobs, laborCodes, currentUserId, isAdmin = false }: EnhancedTimesheetViewProps) {
  // Core state
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>(currentUserId || '')
  const [timesheetRows, setTimesheetRows] = useState<TimesheetRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Timesheet status
  const [timesheetStatus, setTimesheetStatus] = useState<'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('DRAFT')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [userClearedData, setUserClearedData] = useState(false)
  


  // Week calculations
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek])
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])
  
  // Get current day index for highlighting (0 = Monday, 1 = Tuesday, etc.)
  const currentDayIndex = useMemo(() => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    return weekDays.findIndex(day => format(day, 'yyyy-MM-dd') === todayStr)
  }, [weekDays])

  // Load timesheet data when user or week changes
  useEffect(() => {
    debug.timesheet('useEffect', 'User or week changed', {
      selectedUser,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    })

    if (!selectedUser) {
      debug.timesheet('useEffect', 'No user selected, clearing data')
      setTimesheetRows([])
      setTimesheetStatus('DRAFT')
      setSubmissionId(null)
      setUserClearedData(false)
      return
    }

    // Reset the cleared data flag when user or week changes
    setUserClearedData(false)
    loadTimesheetData()
  }, [selectedUser, weekStart, weekEnd])

  const loadTimesheetData = async () => {
    if (!selectedUser) return

    // If user has manually cleared data, don't reload from server
    if (userClearedData) {
      debug.timesheet('loadTimesheetData', 'Skipping data load - user cleared data')
      return
    }

    debug.timesheet('loadTimesheetData', 'Starting data load', {
      userId: selectedUser,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekDisplay: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
    })

    setIsLoading(true)
    try {
      // Check for existing submission first
      const submissionUrl = `/api/timesheet-submissions?userId=${selectedUser}&weekStart=${weekStart.toISOString()}`
      debug.apiCall('GET', submissionUrl)
      
      const submissionResponse = await fetch(submissionUrl)
      
      if (submissionResponse.ok) {
        const submissions = await submissionResponse.json()
        debug.apiResponse('GET', submissionUrl, submissionResponse.status, { count: submissions.length })
        
        if (submissions.length > 0) {
          const submission = submissions[0]
          debug.timesheet('loadTimesheetData', 'Found existing submission', {
            id: submission.id,
            status: submission.status,
            timeEntriesCount: submission.timeEntries?.length || 0
          })
          
          setTimesheetStatus(submission.status)
          setSubmissionId(submission.id)

          // Load time entries from submission
          if (submission.timeEntries && submission.timeEntries.length > 0) {
            debug.timesheet('loadTimesheetData', 'Loading time entries from submission', {
              count: submission.timeEntries.length
            })
            processTimeEntries(submission.timeEntries)
            return
          }
        } else {
          // No submission found - clear any orphaned time entries
          debug.timesheet('loadTimesheetData', 'No submission found - clearing orphaned data')
          setTimesheetRows([])
          setTimesheetStatus('DRAFT')
          setSubmissionId(null)
          return
        }
      } else {
        debug.apiResponse('GET', submissionUrl, submissionResponse.status)
      }

      // If no submission, load time entries directly
      const entriesUrl = `/api/time-entries?userId=${selectedUser}&startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      debug.apiCall('GET', entriesUrl)
      
      const entriesResponse = await fetch(entriesUrl)

      if (entriesResponse.ok) {
        const entries = await entriesResponse.json()
        debug.apiResponse('GET', entriesUrl, entriesResponse.status, { count: entries.length })
        
        // If there are orphaned time entries (no submission), clear them
        if (entries.length > 0 && !submissionId) {
          debug.timesheet('loadTimesheetData', 'Found orphaned time entries - clearing them')
          setTimesheetRows([])
          setTimesheetStatus('DRAFT')
          setSubmissionId(null)
          return
        }
        
        debug.timesheet('loadTimesheetData', 'Loaded time entries directly', {
          count: entries.length,
          entries: entries.map((entry: any) => ({
            id: entry.id,
            date: entry.date,
            hours: `${entry.regularHours}h + ${entry.overtimeHours}h`,
            job: entry.job?.jobNumber,
            code: entry.laborCode?.code
          }))
        })
        processTimeEntries(entries)
      } else {
        debug.apiResponse('GET', entriesUrl, entriesResponse.status)
        debug.error('Timesheet', 'loadTimesheetData', 'Failed to load time entries', {
          status: entriesResponse.status
        })
      }

      setTimesheetStatus('DRAFT')
      setSubmissionId(null)

    } catch (error) {
      debug.error('Timesheet', 'loadTimesheetData', 'Error loading timesheet data', error)
      toast.error('Failed to load timesheet data')
    } finally {
      setIsLoading(false)
    }
  }

  const processTimeEntries = (entries: TimeEntry[]) => {
    debug.timesheet('processTimeEntries', 'Starting data processing', {
      inputCount: entries.length,
      entries: entries.map(entry => ({
        id: entry.id,
        date: entry.date,
        hours: `${entry.regularHours}h + ${entry.overtimeHours}h`,
        job: entry.job?.jobNumber,
        code: entry.laborCode?.code
      }))
    })
    
    // CRITICAL FIX: Sort entries deterministically to ensure consistent processing
    const sortedEntries = [...entries].sort((a, b) => {
      // Primary sort: by date
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      
      // Secondary sort: by creation time for same date
      const createdA = new Date(a.createdAt).getTime()
      const createdB = new Date(b.createdAt).getTime()
      return createdA - createdB
    })
    
    const groupedEntries: Record<string, TimeEntry[]> = {}

    // Group entries by job and labor code
    sortedEntries.forEach(entry => {
      const key = `${entry.job.id}-${entry.laborCode?.id || 'no-code'}`
      if (!groupedEntries[key]) {
        groupedEntries[key] = []
      }
      groupedEntries[key].push(entry)
    })

    debug.dataProcessing('groupEntries', entries.length, Object.keys(groupedEntries).length, {
      groups: Object.entries(groupedEntries).map(([key, groupEntries]) => ({
        key,
        count: groupEntries.length,
        entries: groupEntries.map(e => ({
          id: e.id,
          date: e.date,
          hours: `${e.regularHours}h + ${e.overtimeHours}h`
        }))
      }))
    })

    // Convert to timesheet rows
    const rows: TimesheetRow[] = []
    
    // CRITICAL FIX: Sort group keys for deterministic row order
    const sortedGroupKeys = Object.keys(groupedEntries).sort()
    
    sortedGroupKeys.forEach((key) => {
      const entries = groupedEntries[key]
      const dailyEntries: Record<string, { regularHours: number; overtimeHours: number; timeEntryId?: string }> = {}
      let totalRegularHours = 0
      let totalOvertimeHours = 0

      weekDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayEntries = entries.filter(entry => {
          // Handle both date strings and Date objects
          const entryDate = typeof entry.date === 'string' ? entry.date.split('T')[0] : format(new Date(entry.date), 'yyyy-MM-dd')
          const matches = entryDate === dayStr
          if (matches) {
            console.log(`    Match found: ${dayStr} = ${entryDate}`)
          }
          return matches
        })
        
        const dayRegular = dayEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
        const dayOvertime = dayEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
        
        dailyEntries[dayStr] = { 
          regularHours: dayRegular, 
          overtimeHours: dayOvertime,
          timeEntryId: dayEntries.length > 0 ? dayEntries[0].id : undefined
        }
        
        totalRegularHours += dayRegular
        totalOvertimeHours += dayOvertime
      })

      if (entries.length > 0) {
        const firstEntry = entries[0]
        rows.push({
          id: key,
          jobId: firstEntry.job.id,
          jobNumber: firstEntry.job.jobNumber,
          jobTitle: firstEntry.job.title,
          laborCodeId: firstEntry.laborCode?.id || '',
          laborCode: firstEntry.laborCode?.code || 'No Code',
          notes: firstEntry.notes || '',
          dailyEntries,
          totalRegularHours,
          totalOvertimeHours,
          totalHours: totalRegularHours + totalOvertimeHours
        })
      }
    })

    debug.dataProcessing('createTimesheetRows', Object.keys(groupedEntries).length, rows.length, {
      rows: rows.map(row => ({
        id: row.id,
        job: row.jobNumber,
        code: row.laborCode,
        totalHours: row.totalHours,
        dailyEntries: Object.keys(row.dailyEntries).length
      }))
    })
    
    setTimesheetRows(rows)
  }

  // Navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1))
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1))
    }
  }

  // Utility functions
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

  // Row management
  const addNewRow = () => {
    if (!selectedUser) {
      toast.error('Please select an employee first')
      return
    }
    
    const newRow: TimesheetRow = {
      id: `new-${Date.now()}`,
      jobId: '',
      jobNumber: '',
      jobTitle: 'Select Job',
      laborCodeId: '',
      laborCode: 'Select Code',
      notes: '',
      dailyEntries: {},
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalHours: 0
    }
    setTimesheetRows(prev => [...prev, newRow])
  }

  const removeRow = (rowId: string) => {
    if (!confirm('Are you sure you want to delete this entire row? This will remove all time entries for this job/labor code combination.')) {
      return
    }
    
    setTimesheetRows(prev => prev.filter(row => row.id !== rowId))
  }

  const clearRowHours = (rowId: string) => {
    if (!confirm('Are you sure you want to clear all hours in this row? This will set all hours to 0 but keep the job details.')) {
      return
    }
    
    setTimesheetRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const clearedDailyEntries: Record<string, { regularHours: number; overtimeHours: number }> = {}
        
        // Clear all daily entries to 0
        weekDays.forEach(day => {
          const dayStr = format(day, 'yyyy-MM-dd')
          clearedDailyEntries[dayStr] = { 
            regularHours: 0, 
            overtimeHours: 0 
          }
        })
        
        return {
          ...row,
          dailyEntries: clearedDailyEntries,
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalHours: 0
        }
      }
      return row
    }))
  }

  const clearAllTimesheetData = async () => {
    if (!confirm('Are you sure you want to clear all timesheet data? This will remove all rows and start fresh.')) {
      return
    }
    
    // Clear local state immediately
    setTimesheetRows([])
    setTimesheetStatus('DRAFT')
    setSubmissionId(null)
    setUserClearedData(true) // Mark that user intentionally cleared data
    
    // Also delete any orphaned time entries from the database
    if (selectedUser) {
      try {
        const entriesUrl = `/api/time-entries?userId=${selectedUser}&startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        const entriesResponse = await fetch(entriesUrl)
        
        if (entriesResponse.ok) {
          const entries = await entriesResponse.json()
          
          // Delete each orphaned time entry
          for (const entry of entries) {
            await fetch(`/api/time-entries/${entry.id}`, {
              method: 'DELETE'
            })
          }
          
          if (entries.length > 0) {
            toast.success(`Cleared ${entries.length} orphaned time entries`)
          }
        }
      } catch (error) {
        console.error('Error clearing orphaned time entries:', error)
        // Don't show error to user as local state is already cleared
      }
    }
  }

  // Update functions
  const updateRowHours = (rowId: string, dayStr: string, type: 'regular' | 'overtime', hours: number) => {
    setTimesheetRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const newDailyEntries = { ...row.dailyEntries }
        if (!newDailyEntries[dayStr]) {
          // Create new entry without timeEntryId (will be a new entry)
          newDailyEntries[dayStr] = { 
            regularHours: 0, 
            overtimeHours: 0
          }
        }
        newDailyEntries[dayStr] = {
          ...newDailyEntries[dayStr],
          [type === 'regular' ? 'regularHours' : 'overtimeHours']: hours,
          // Clear timeEntryId when hours are set to 0 to prevent persistence
          timeEntryId: hours === 0 ? undefined : newDailyEntries[dayStr].timeEntryId
        }
        
        const totalRegularHours = Object.values(newDailyEntries).reduce((sum, entry) => sum + entry.regularHours, 0)
        const totalOvertimeHours = Object.values(newDailyEntries).reduce((sum, entry) => sum + entry.overtimeHours, 0)
        const totalHours = totalRegularHours + totalOvertimeHours
        
        // If all hours are 0, clear the job details to make it easier to add new data
        if (totalHours === 0) {
          return {
            ...row,
            jobId: '',
            jobNumber: '',
            jobTitle: '',
            laborCodeId: '',
            laborCode: '',
            notes: '',
            dailyEntries: newDailyEntries,
            totalRegularHours: 0,
            totalOvertimeHours: 0,
            totalHours: 0
          }
        }
        
        return {
          ...row,
          dailyEntries: newDailyEntries,
          totalRegularHours,
          totalOvertimeHours,
          totalHours
        }
      }
      return row
    }))
  }

  const updateRowJob = (rowId: string, jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      setTimesheetRows(prev => prev.map(row => 
        row.id === rowId 
          ? { ...row, jobId: job.id, jobNumber: job.jobNumber, jobTitle: job.title }
          : row
      ))
    }
  }

  const updateRowLaborCode = (rowId: string, laborCodeId: string) => {
    const laborCode = laborCodes.find(lc => lc.id === laborCodeId)
    if (laborCode) {
      setTimesheetRows(prev => prev.map(row => 
        row.id === rowId 
          ? { ...row, laborCodeId: laborCode.id, laborCode: laborCode.code }
          : row
      ))
    }
  }

  const updateRowNotes = (rowId: string, notes: string) => {
    setTimesheetRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, notes } : row
    ))
  }


  // Submit functionality
  const submitTimesheet = async () => {
    if (!selectedUser) {
      toast.error('Please select an employee first')
      return
    }

    setIsLoading(true)
    try {
      const timeEntries = convertRowsToTimeEntries()

      if (timeEntries.length === 0) {
        toast.error('Please add at least one time entry before submitting')
        return
      }

      const response = await fetch('/api/timesheet-submissions', {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUser,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          timeEntries: timeEntries
        })
      })

      if (response.ok) {
        toast.success('Timesheet submitted for approval!')
        await loadTimesheetData() // Reload to show updated status
      } else {
        const errorData = await response.json()
        toast.error(`Failed to submit timesheet: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      toast.error('Failed to submit timesheet')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete functions

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    // No need for warning since we now allow reopening approved timesheets
    // Users can delete freely when timesheet is in DRAFT status

    if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/time-entries/${timeEntryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Time entry deleted successfully')
        
        // Update local state immediately instead of reloading from server
        setTimesheetRows(prev => {
          return prev.map(row => {
            const updatedDailyEntries = { ...row.dailyEntries }
            let hasAnyEntries = false
            
            // Clear the specific time entry and check if row has any remaining entries
            Object.keys(updatedDailyEntries).forEach(dayStr => {
              if (updatedDailyEntries[dayStr].timeEntryId === timeEntryId) {
                updatedDailyEntries[dayStr] = { 
                  regularHours: 0, 
                  overtimeHours: 0 
                }
              }
              if (updatedDailyEntries[dayStr].regularHours > 0 || updatedDailyEntries[dayStr].overtimeHours > 0) {
                hasAnyEntries = true
              }
            })
            
            // Recalculate totals
            const totalRegularHours = Object.values(updatedDailyEntries).reduce((sum, entry) => sum + entry.regularHours, 0)
            const totalOvertimeHours = Object.values(updatedDailyEntries).reduce((sum, entry) => sum + entry.overtimeHours, 0)
            const totalHours = totalRegularHours + totalOvertimeHours
            
            // If no entries remain, clear the job details and reset to empty state
            if (!hasAnyEntries) {
              return {
                ...row,
                jobId: '',
                jobNumber: '',
                jobTitle: '',
                laborCodeId: '',
                laborCode: '',
                notes: '',
                dailyEntries: updatedDailyEntries,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                totalHours: 0
              }
            }
            
            return {
              ...row,
              dailyEntries: updatedDailyEntries,
              totalRegularHours,
              totalOvertimeHours,
              totalHours
            }
          })
        })
      } else {
        const errorData = await response.json()
        // Provide better error messages for common issues
        if (errorData.error?.includes('approved timesheet')) {
          toast.error('Cannot delete time entries from approved timesheets')
        } else {
          toast.error(`Failed to delete time entry: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error deleting time entry:', error)
      toast.error('Failed to delete time entry')
    }
  }

  // Helper function to convert rows to time entries
  const convertRowsToTimeEntries = () => {
      const timeEntries = []
    
    debug.timesheet('convertRowsToTimeEntries', 'Starting conversion', {
      rowsCount: timesheetRows.length,
      rows: timesheetRows.map(row => ({
        id: row.id,
        jobId: row.jobId,
        laborCodeId: row.laborCodeId,
        dailyEntries: Object.entries(row.dailyEntries).map(([day, entry]) => ({
          day,
          regularHours: entry.regularHours,
          overtimeHours: entry.overtimeHours,
          timeEntryId: entry.timeEntryId
        }))
      }))
    })
      
      for (const row of timesheetRows) {
        if (row.jobId && row.laborCodeId) {
          for (const [dayStr, entry] of Object.entries(row.dailyEntries)) {
          // CRITICAL FIX: Always include entries with timeEntryId to preserve existing data
          // Only skip completely new empty entries (no timeEntryId AND no hours)
          if (entry.timeEntryId || entry.regularHours > 0 || entry.overtimeHours > 0) {
            const timeEntry = {
              id: entry.timeEntryId, // Stable ID for existing entries
                date: dayStr,
                regularHours: entry.regularHours,
                overtimeHours: entry.overtimeHours,
                notes: row.notes,
                billable: true,
                jobId: row.jobId,
                laborCodeId: row.laborCodeId
            }
            
            debug.timesheet('convertRowsToTimeEntries', `Processing ${dayStr}`, {
              timeEntry,
              hasTimeEntryId: !!entry.timeEntryId,
              willBeNew: !entry.timeEntryId,
              operation: entry.timeEntryId ? 'UPDATE' : 'CREATE'
            })
            
            timeEntries.push(timeEntry)
          }
        }
      }
    }
    
    debug.timesheet('convertRowsToTimeEntries', 'Conversion complete', {
      totalEntries: timeEntries.length,
      newEntries: timeEntries.filter(e => !e.id).length,
      updateEntries: timeEntries.filter(e => e.id).length,
      // CRITICAL: Ensure we're not losing any existing entries
      entriesWithIds: timeEntries.filter(e => e.id).length
    })
    
    return timeEntries
  }

  // Calculate totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { regular: number; overtime: number; total: number }> = {}
    weekDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayRegular = timesheetRows.reduce((sum, row) => sum + (row.dailyEntries[dayStr]?.regularHours || 0), 0)
      const dayOvertime = timesheetRows.reduce((sum, row) => sum + (row.dailyEntries[dayStr]?.overtimeHours || 0), 0)
      totals[dayStr] = {
        regular: dayRegular,
        overtime: dayOvertime,
        total: dayRegular + dayOvertime
      }
    })
    return totals
  }, [timesheetRows, weekDays])

  const weeklyTotals = useMemo(() => {
    const regular = Object.values(dailyTotals).reduce((sum, day) => sum + day.regular, 0)
    const overtime = Object.values(dailyTotals).reduce((sum, day) => sum + day.overtime, 0)
    return { regular, overtime, total: regular + overtime }
  }, [dailyTotals])

  const selectedUserName = users.find(u => u.id === selectedUser)?.name || 'Select Employee'
  const isReadOnly = timesheetStatus === 'APPROVED'

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <Label htmlFor="employee-select">Employee:</Label>
            <Select value={selectedUser} onValueChange={isAdmin ? setSelectedUser : undefined} disabled={!isAdmin} data-testid="user-select">
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600">
            Week
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-sm lg:text-lg font-medium">
            <span className="hidden sm:inline">This week: </span>{format(weekStart, 'dd')} - {format(weekEnd, 'dd MMM yyyy')}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="text-sm text-gray-600">
            Employee: <span className="font-medium">{selectedUserName}</span>
          </div>
          {timesheetStatus !== 'DRAFT' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                timesheetStatus === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                timesheetStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                timesheetStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {timesheetStatus}
              </span>
              {isReadOnly && (
                <span className="text-sm text-gray-500 italic">(Read-only)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Read-only Notice */}
      {isReadOnly && (
        <div className="p-4 rounded-lg border-l-4 bg-green-50 border-green-400">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-3 bg-green-400"></div>
            <div>
              <h3 className="text-sm font-medium text-green-800">
                Timesheet Approved
              </h3>
              <p className="text-sm text-green-700">
                This timesheet has been approved and is now read-only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Notice */}
      {timesheetStatus === 'SUBMITTED' && !isReadOnly && (
        <div className="p-4 rounded-lg border-l-4 bg-yellow-50 border-yellow-400">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-3 bg-yellow-400"></div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Timesheet Submitted
              </h3>
              <p className="text-sm text-yellow-700">
                This timesheet has been submitted for approval but is still editable until approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedUser ? (
        <>
          {/* Timesheet Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto" data-testid="timesheet-grid">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 lg:p-4 font-medium text-gray-900 min-w-[180px] lg:min-w-[200px]">
                        Job & Code
                      </th>
                      <th className="text-left p-2 lg:p-4 font-medium text-gray-900 min-w-[120px] lg:min-w-[150px] hidden sm:table-cell">
                        Notes
                      </th>
                      {weekDays.map((day, index) => (
                        <th 
                          key={day.toISOString()} 
                          className={`text-center p-2 lg:p-4 font-medium text-gray-900 min-w-[100px] lg:min-w-[140px] ${
                            index === currentDayIndex ? 'bg-orange-100' : ''
                          }`}
                        >
                          <div className="text-xs lg:text-sm">{format(day, 'EEE dd MMM')}</div>
                          <div className="text-xs text-gray-500 mt-1 hidden lg:block">
                            <div>Regular</div>
                            <div>Overtime</div>
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-2 lg:p-4 font-medium text-gray-900 min-w-[80px] lg:min-w-[120px]">
                        Total
                      </th>
                      <th className="text-center p-2 lg:p-4 font-medium text-gray-900 min-w-[40px] lg:min-w-[50px]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {timesheetRows.map((row) => (
                      <tr key={`row-${row.jobId}-${row.laborCodeId}`} className="border-b hover:bg-gray-50">
                        <td className="p-2 lg:p-4">
                          <div className="space-y-2">
                            <SearchableSelect
                              options={jobs.map(job => ({
                                value: job.id,
                                label: `${job.jobNumber} - ${job.title}`,
                                searchText: `${job.jobNumber} ${job.title} ${job.status || ''}`
                              }))}
                              value={row.jobId}
                              onValueChange={(value) => updateRowJob(row.id, value)}
                              placeholder="Select Job"
                              disabled={isReadOnly}
                              className={`text-sm ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            
                            <Select 
                              value={row.laborCodeId} 
                              onValueChange={(value) => updateRowLaborCode(row.id, value)}
                              disabled={isReadOnly}
                              data-testid="labor-code-select"
                            >
                              <SelectTrigger className={`text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}>
                                <SelectValue placeholder="Select Code" />
                              </SelectTrigger>
                              <SelectContent>
                                {laborCodes.map(lc => (
                                  <SelectItem key={lc.id} value={lc.id}>
                                    {lc.code} - {(lc as any).name || lc.description || 'Unnamed'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        
                        <td className="p-2 lg:p-4 hidden sm:table-cell">
                          <Textarea
                            value={row.notes}
                            onChange={(e) => updateRowNotes(row.id, e.target.value)}
                            placeholder="Notes..."
                            className={`min-h-[60px] lg:min-h-[80px] text-sm lg:text-base ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            disabled={isReadOnly}
                            data-testid="notes-input"
                          />
                        </td>
                        
                        {weekDays.map((day, index) => {
                          const dayStr = format(day, 'yyyy-MM-dd')
                          const entry = row.dailyEntries[dayStr] || { regularHours: 0, overtimeHours: 0 }
                          return (
                            <td 
                              key={dayStr} 
                              className={`text-center p-1 lg:p-2 ${index === currentDayIndex ? 'bg-orange-50' : ''}`}
                            >
                              <div className="w-full">
                                <PopupTimeSelector
                                  regularHours={entry.regularHours}
                                  overtimeHours={entry.overtimeHours}
                                  onRegularHoursChange={(hours) => updateRowHours(row.id, dayStr, 'regular', hours)}
                                  onOvertimeHoursChange={(hours) => updateRowHours(row.id, dayStr, 'overtime', hours)}
                                  disabled={isReadOnly}
                                  className="text-xs"
                                />
                              </div>
                            </td>
                          )
                        })}
                        
                        <td className="text-center p-2 lg:p-4">
                          <div className="space-y-1">
                            <div className="font-medium text-xs lg:text-sm">
                              {formatTime(row.totalRegularHours)} / {formatTime(row.totalOvertimeHours)}
                            </div>
                            <div className="font-bold text-sm lg:text-lg">
                              {formatTime(row.totalHours)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="text-center p-2 lg:p-4">
                          <div className="flex flex-col space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearRowHours(row.id)}
                              className="text-orange-500 hover:text-orange-700 text-xs"
                              disabled={isReadOnly}
                              title="Clear all hours in this row"
                            >
                              <span className="hidden sm:inline">Clear Hours</span>
                              <span className="sm:hidden">Clear</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow(row.id)}
                              className="text-red-500 hover:text-red-700"
                              disabled={isReadOnly}
                              data-testid="remove-row-button"
                              title="Delete entire row"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  <tfoot>
                    <tr className="border-t-2 bg-gray-100">
                      <td className="p-2 lg:p-4 font-semibold text-gray-900" colSpan={2}>
                        <span className="hidden sm:inline">Daily Totals</span>
                        <span className="sm:hidden">Totals</span>
                      </td>
                      {weekDays.map((day, index) => {
                        const dayStr = format(day, 'yyyy-MM-dd')
                        const totals = dailyTotals[dayStr]
                        return (
                          <td 
                            key={dayStr} 
                            className={`text-center p-2 lg:p-4 font-semibold text-gray-900 ${
                              index === currentDayIndex ? 'bg-orange-100' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-xs lg:text-sm">
                                {formatTime(totals.regular)} / {formatTime(totals.overtime)}
                              </div>
                              <div className="font-bold text-sm lg:text-base">
                                {formatTime(totals.total)}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-center p-2 lg:p-4 font-bold text-gray-900 text-sm lg:text-lg">
                        <div className="space-y-1">
                          <div className="text-xs lg:text-sm">
                            {formatTime(weeklyTotals.regular)} / {formatTime(weeklyTotals.overtime)}
                          </div>
                          <div className="text-sm lg:text-xl">
                            {formatTime(weeklyTotals.total)}
                          </div>
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Button 
                onClick={addNewRow} 
                variant="outline"
                disabled={isReadOnly || isLoading}
                data-testid="add-row-button"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add row
              </Button>
              <Button 
                onClick={clearAllTimesheetData} 
                variant="outline"
                disabled={isReadOnly || isLoading || timesheetRows.length === 0}
                className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                data-testid="clear-all-button"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Button variant="outline" disabled={isLoading} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              {timesheetStatus === 'DRAFT' ? (
                <Button 
                  onClick={submitTimesheet} 
                  className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Submit week for approval</span>
                  <span className="sm:hidden">Submit</span>
                </Button>
              ) : timesheetStatus === 'SUBMITTED' ? (
                <Button 
                  onClick={submitTimesheet} 
                  className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Re-submit for approval</span>
                  <span className="sm:hidden">Re-submit</span>
                </Button>
              ) : timesheetStatus === 'APPROVED' ? (
                <Button disabled className="bg-green-400 cursor-not-allowed w-full sm:w-auto">
                  <Check className="h-4 w-4 mr-2" />
                  Approved
                </Button>
              ) : timesheetStatus === 'REJECTED' ? (
                <Button 
                  onClick={submitTimesheet} 
                  className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Resubmit for approval</span>
                  <span className="sm:hidden">Resubmit</span>
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Employee</h3>
            <p className="text-gray-600">Please select an employee from the dropdown above to start logging time entries.</p>
          </CardContent>
        </Card>
      )}
      
    </div>
  )
}